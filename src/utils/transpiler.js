/**
 * transpiler.js
 * ─────────────────────────────────────────────────────────────────────────────
 * In-browser JSX / TSX transpilation using @babel/standalone (loaded via CDN).
 *
 * Babel is injected into index.html as a <script> tag, making it available
 * globally as window.Babel. This module wraps it with a clean API.
 */

const TRANSPILABLE_EXTS = new Set(['js', 'jsx', 'ts', 'tsx']);

/**
 * Returns the Babel instance once it is available on window.
 * Polls every 50 ms (max 30 s).
 */
export function waitForBabel() {
  return new Promise((resolve, reject) => {
    if (window.Babel) { resolve(window.Babel); return; }
    let tries = 0;
    const id = setInterval(() => {
      if (window.Babel) { clearInterval(id); resolve(window.Babel); return; }
      if (++tries > 600) { clearInterval(id); reject(new Error('Babel failed to load after 30 s')); }
    }, 50);
  });
}

/**
 * Synchronously transpile a single file.
 * Returns { code: string, error: string|null }
 */
export function transpileFile(code, filename) {
  if (!window.Babel) {
    return { code: null, error: 'Babel is not loaded yet. Please wait a moment and try again.' };
  }

  const ext = filename.split('.').pop().toLowerCase();
  if (!TRANSPILABLE_EXTS.has(ext)) {
    return { code, error: null }; // Return non-JS files as-is
  }

  const isTS = ext === 'ts' || ext === 'tsx';

  try {
    const presets = [
      ['react', { runtime: 'classic' }],
    ];
    if (isTS) {
      presets.push(['typescript', { allExtensions: true, isTSX: ext === 'tsx' }]);
    }

    const result = window.Babel.transform(code, {
      filename,
      presets,
      plugins: ['transform-modules-commonjs'],
      sourceMaps: false,
      compact: false,
    });

    return { code: result.code, error: null };
  } catch (err) {
    return { code: null, error: err.message || String(err) };
  }
}

/**
 * Check if a filename should be transpiled.
 */
export function isTranspilable(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return TRANSPILABLE_EXTS.has(ext);
}
