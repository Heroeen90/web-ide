// ─── Default template files loaded on first IDE launch ───────────────────────

export const DEFAULT_FILES = {
  'App.jsx': `import React, { useState, useEffect } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState('dark');

  return (
    <div
      className="min-h-screen flex items-center justify-center transition-colors duration-300"
      style={{ background: theme === 'dark' ? '#070d19' : '#f0f4ff' }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ border: '1px solid rgba(0,212,204,0.2)', background: theme === 'dark' ? '#0d1929' : '#fff' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(0,212,204,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <span
              className="font-bold text-lg tracking-tight"
              style={{ color: '#00d4cc', fontFamily: 'JetBrains Mono, monospace' }}
            >
              WebIDE
            </span>
          </div>
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="text-lg px-2 py-1 rounded-lg transition-colors"
            style={{ background: 'rgba(0,212,204,0.1)', border: '1px solid rgba(0,212,204,0.2)' }}
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-8 text-center">
          <p
            className="text-sm mb-1"
            style={{ color: theme === 'dark' ? '#6a8fae' : '#666' }}
          >
            Interactive Counter
          </p>
          <div
            className="text-6xl font-mono font-bold my-4"
            style={{ color: '#00d4cc' }}
          >
            {String(count).padStart(3, '0')}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setCount(c => c - 1)}
              className="w-11 h-11 rounded-xl text-xl font-bold transition-all active:scale-95"
              style={{
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.3)',
                color: '#f87171',
              }}
            >
              −
            </button>
            <button
              onClick={() => setCount(0)}
              className="px-4 h-11 rounded-xl text-xs font-semibold transition-all active:scale-95"
              style={{
                background: 'rgba(0,212,204,0.05)',
                border: '1px solid rgba(0,212,204,0.2)',
                color: theme === 'dark' ? '#6a8fae' : '#999',
              }}
            >
              RESET
            </button>
            <button
              onClick={() => setCount(c => c + 1)}
              className="w-11 h-11 rounded-xl text-xl font-bold transition-all active:scale-95"
              style={{
                background: 'rgba(52,211,153,0.1)',
                border: '1px solid rgba(52,211,153,0.3)',
                color: '#34d399',
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 text-center text-xs"
          style={{
            borderTop: '1px solid rgba(0,212,204,0.1)',
            color: theme === 'dark' ? '#3d6080' : '#aaa',
          }}
        >
          Edit this file in the editor to see live preview →
        </div>
      </div>
    </div>
  );
}
`,

  'style.css': `/* ─── Global Styles ──────────────────────────────────────────────── */

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ─── Custom Animations ──────────────────────────────────────────── */

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.05); }
}

.fade-up  { animation: fadeUp 0.4s ease forwards; }
.pulse    { animation: pulse 2s ease-in-out infinite; }
`,

  'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My App</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
`,

  'package.json': `{
  "name": "my-app",
  "version": "1.0.0",
  "description": "A React app built with WebIDE",
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
`,
};

// ─── File metadata ────────────────────────────────────────────────────────────

export const FILE_ICONS = {
  jsx:  '⚛️',
  tsx:  '⚛️',
  js:   '📜',
  ts:   '📘',
  css:  '🎨',
  html: '🌐',
  json: '📋',
  md:   '📝',
  svg:  '🖼️',
};

export const FILE_LANGUAGE_MAP = {
  jsx:  'javascript',
  tsx:  'typescript',
  js:   'javascript',
  ts:   'typescript',
  css:  'css',
  html: 'html',
  json: 'json',
  md:   'markdown',
  svg:  'xml',
};

export const FILE_TEMPLATES = {
  jsx: (name) => `import React from 'react';\n\nexport default function ${name}() {\n  return (\n    <div className="p-4">\n      <h1>${name}</h1>\n    </div>\n  );\n}\n`,
  tsx: (name) => `import React from 'react';\n\ninterface Props {}\n\nexport default function ${name}({}: Props) {\n  return (\n    <div className="p-4">\n      <h1>${name}</h1>\n    </div>\n  );\n}\n`,
  js:  (name) => `// ${name}.js\n\nexport function ${name}() {\n  // ...\n}\n`,
  ts:  (name) => `// ${name}.ts\n\nexport function ${name}(): void {\n  // ...\n}\n`,
  css: (name) => `/* ${name}.css */\n\n`,
  html:(name) => `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>${name}</title>\n</head>\n<body>\n  <h1>${name}</h1>\n</body>\n</html>\n`,
  json:(name) => `{\n  "name": "${name.toLowerCase()}"\n}\n`,
};
