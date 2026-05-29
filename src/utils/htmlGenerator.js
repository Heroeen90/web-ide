/**
 * htmlGenerator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates the full HTML document injected into the preview <iframe>.
 *
 * Architecture:
 *   1. Transpile every JS/JSX/TS/TSX file with Babel (CommonJS output)
 *   2. Wrap each module in a factory function stored in __registry
 *   3. Provide a tiny CommonJS runtime (__require / __registry / __cache)
 *   4. Map 'react' and 'react-dom' to window.React / window.ReactDOM
 *      which are loaded from the React 18 UMD CDN bundle
 *   5. Auto-mount the default export of App.jsx (or run main.jsx/index.jsx
 *      if present, which are expected to do their own ReactDOM.createRoot)
 *   6. Intercept console.* and window.onerror, forwarding them to the parent
 *      via window.parent.postMessage so the ConsolePanel can display them
 */

import { transpileFile } from './transpiler.js';

// ─── Self-mounting entry files (they call ReactDOM.createRoot themselves) ─────
const SELF_MOUNTING = new Set(['main.jsx', 'main.tsx', 'index.jsx', 'index.tsx']);

// ─── Console interception injected at top of iframe <body> ───────────────────
const CONSOLE_INTERCEPTOR = /* js */`
(function () {
  'use strict';
  var _log   = console.log.bind(console);
  var _warn  = console.warn.bind(console);
  var _error = console.error.bind(console);
  var _info  = console.info.bind(console);
  var _debug = console.debug.bind(console);

  function safe(v) {
    if (v === null)      return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'function') return '[Function: ' + (v.name || 'anonymous') + ']';
    if (v instanceof Error) return v.stack || v.message;
    if (typeof v === 'object') {
      try { return JSON.stringify(v, null, 2); } catch (_) { return Object.prototype.toString.call(v); }
    }
    return String(v);
  }

  function post(level, args) {
    var serialized = Array.prototype.slice.call(args).map(safe);
    try {
      window.parent.postMessage({ type: 'console', level: level, args: serialized, ts: Date.now() }, '*');
    } catch (_) {}
  }

  console.log   = function() { post('log',   arguments); _log.apply(console, arguments);   };
  console.warn  = function() { post('warn',  arguments); _warn.apply(console, arguments);  };
  console.error = function() { post('error', arguments); _error.apply(console, arguments); };
  console.info  = function() { post('info',  arguments); _info.apply(console, arguments);  };
  console.debug = function() { post('debug', arguments); _debug.apply(console, arguments); };

  window.onerror = function(msg, src, line, col, err) {
    post('error', [err ? (err.stack || err.message) : (msg + ' (' + src + ':' + line + ':' + col + ')')]);
    return false;
  };

  window.addEventListener('unhandledrejection', function(e) {
    var reason = e.reason;
    post('error', ['Unhandled Promise Rejection: ' + (reason && (reason.stack || reason.message || String(reason)))]);
  });

  window.parent.postMessage({ type: 'preview-ready', ts: Date.now() }, '*');
})();
`;

// ─── CommonJS module runtime injected before user modules ────────────────────
const MODULE_RUNTIME = /* js */`
(function(global) {
  'use strict';
  var __registry = Object.create(null);
  var __cache    = Object.create(null);

  global.__define = function(id, factory) {
    __registry[id] = factory;
  };

  global.__require = function require(id) {
    // ── Built-in package shims ────────────────────────────────────────────
    if (id === 'react')             return global.React;
    if (id === 'react-dom')         return global.ReactDOM;
    if (id === 'react-dom/client')  return { createRoot: global.ReactDOM.createRoot.bind(global.ReactDOM), hydrateRoot: global.ReactDOM.hydrateRoot ? global.ReactDOM.hydrateRoot.bind(global.ReactDOM) : void 0 };
    if (id === 'react/jsx-runtime') return { jsx: global.React.createElement, jsxs: global.React.createElement, Fragment: global.React.Fragment };

    // ── Resolve user module key ───────────────────────────────────────────
    var key = id.replace(/^\\.?\\//, '');     // strip leading ./ or /

    // Cache hit
    if (__cache[key] !== undefined) return __cache[key];

    // Look up with or without extension
    var factoryKey = key;
    if (!__registry[factoryKey]) {
      var exts = ['.jsx', '.js', '.tsx', '.ts'];
      for (var i = 0; i < exts.length; i++) {
        if (__registry[key + exts[i]]) { factoryKey = key + exts[i]; break; }
      }
    }

    if (!__registry[factoryKey]) {
      console.error('[WebIDE] Module not found: "' + id + '"');
      return {};
    }

    // Execute factory
    var mod = { exports: Object.create(null), id: factoryKey };
    __cache[key] = mod.exports;
    __registry[factoryKey](mod, mod.exports, global.__require);
    __cache[key] = mod.exports;
    return mod.exports;
  };
})(window);
`;

// ─── Error display injected inline when preview cannot be generated ───────────
function errorHTML(message, detail = '') {
  const escaped = (str) =>
    String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return /* html */`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { background:#070d19; color:#dde8f5; font-family:'JetBrains Mono',Consolas,monospace;
           display:flex; align-items:flex-start; justify-content:center; min-height:100vh; margin:0; padding:24px; }
    .card { background:#0d1929; border:1px solid #7f1d1d; border-radius:10px; padding:24px; max-width:680px; width:100%; }
    h2   { color:#f87171; margin:0 0 12px; font-size:15px; display:flex; align-items:center; gap:8px; }
    pre  { color:#fca5a5; font-size:12px; white-space:pre-wrap; line-height:1.6; margin:0; }
    .detail { margin-top:12px; color:#6a8fae; font-size:11px; white-space:pre-wrap; }
  </style>
</head>
<body>
  <div class="card">
    <h2>⚠ Preview Error</h2>
    <pre>${escaped(message)}</pre>
    ${detail ? `<div class="detail">${escaped(detail)}</div>` : ''}
  </div>
</body>
</html>`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * generatePreviewHTML(files)
 * Takes the virtual file system map { filename → content } and returns a
 * fully-formed HTML string ready to be injected into the preview iframe.
 */
export function generatePreviewHTML(files) {
  if (!window.Babel) {
    return errorHTML(
      'Babel transpiler is still loading…',
      'Wait a moment for Babel to load from the CDN, then click ▶ Run.'
    );
  }

  // ── 1. Transpile all JS/JSX/TS/TSX files ───────────────────────────────
  const transpiled = {};
  const transpileErrors = [];

  for (const [name, code] of Object.entries(files)) {
    const ext = name.split('.').pop().toLowerCase();
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
      const { code: out, error } = transpileFile(code, name);
      if (error) {
        transpileErrors.push({ name, error });
        // Store placeholder so we can still render other files
        transpiled[name] = `/* ⚠ Transpile error in ${name}: ${error.replace(/\*\//g, '* /')} */`;
      } else {
        transpiled[name] = out;
      }
    }
  }

  // If ALL files failed, show combined error
  if (transpileErrors.length === Object.keys(transpiled).length && transpileErrors.length > 0) {
    const { name, error } = transpileErrors[0];
    return errorHTML(`Transpile error in ${name}`, error);
  }

  // ── 2. Choose entry point ───────────────────────────────────────────────
  const allFileNames = Object.keys(files);
  const entryFile =
    allFileNames.find(f => SELF_MOUNTING.has(f))  ||   // main.jsx / index.jsx
    allFileNames.find(f => f === 'App.jsx')         ||
    allFileNames.find(f => f === 'App.tsx')          ||
    Object.keys(transpiled)[0];

  if (!entryFile) {
    return errorHTML('No entry file found.', 'Create an App.jsx file to get started.');
  }

  const isSelfMounting = SELF_MOUNTING.has(entryFile);

  // ── 3. Build __define() calls for each module ───────────────────────────
  const moduleBlocks = Object.entries(transpiled)
    .map(([name, code]) => {
      // Escape for safe embedding in a template literal inside a JS string
      const safeCode = code.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
      return (
        `// ════ Module: ${name} ════\n` +
        `__define(${JSON.stringify(name)}, function(module, exports, require) {\n` +
        `  "use strict";\n` +
        `  var __filename = ${JSON.stringify(name)};\n` +
        `${code}\n` +
        `});\n`
      );
    })
    .join('\n');

  // ── 4. Entry-point bootstrap ────────────────────────────────────────────
  const bootstrap = isSelfMounting
    ? /* js */`
// Self-mounting entry: ${entryFile}
try {
  __require(${JSON.stringify('./' + entryFile)});
} catch (err) {
  console.error('[WebIDE] Runtime error in ${entryFile}:', err);
  document.getElementById('root').innerHTML =
    '<div style="padding:24px;color:#f87171;font-family:monospace;background:#0d1929;min-height:100vh">' +
    '<h2 style="color:#f87171;margin:0 0 12px">⚠ Runtime Error</h2>' +
    '<pre style="white-space:pre-wrap;font-size:12px">' + (err.stack || err.message || String(err)) + '</pre></div>';
}
`
    : /* js */`
// Auto-mount: ${entryFile}
try {
  var __entry = __require(${JSON.stringify('./' + entryFile)});
  var __App   = (__entry && __entry.default) ? __entry.default : __entry;

  if (typeof __App !== 'function') {
    throw new Error('No default export found in ${entryFile}.\\nMake sure you have: export default function App() { ... }');
  }

  var __root = window.ReactDOM.createRoot(document.getElementById('root'));
  __root.render(window.React.createElement(__App));
} catch (err) {
  console.error('[WebIDE] Runtime error:', err);
  document.getElementById('root').innerHTML =
    '<div style="padding:24px;color:#f87171;font-family:monospace;background:#0d1929;min-height:100vh">' +
    '<h2 style="color:#f87171;margin:0 0 12px">⚠ Runtime Error</h2>' +
    '<pre style="white-space:pre-wrap;font-size:12px">' + (err.stack || err.message || String(err)) + '</pre></div>';
}
`;

  // ── 5. Collect CSS ──────────────────────────────────────────────────────
  const cssContent = files['style.css'] || files['styles.css'] || files['index.css'] || '';

  // ── 6. Assemble final HTML ──────────────────────────────────────────────
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- TailwindCSS CDN (Play) -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- React 18 UMD (development build for readable errors) -->
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; }
  </style>
  <!-- User CSS -->
  <style id="user-styles">
${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- Console interception (must run first) -->
  <script>${CONSOLE_INTERCEPTOR}</script>

  <!-- CommonJS module runtime -->
  <script>${MODULE_RUNTIME}</script>

  <!-- User modules + bootstrap -->
  <script>
${moduleBlocks}
${bootstrap}
  </script>
</body>
</html>`;
}

export { errorHTML };
