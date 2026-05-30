export const DEFAULT_FILES = {
  'App.jsx': `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
           style={{ border: '1px solid rgba(0,212,204,0.2)', background: '#0d1929' }}>
        <div className="px-6 py-5 flex items-center justify-between"
             style={{ borderBottom: '1px solid rgba(0,212,204,0.15)' }}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <span className="font-bold text-lg" style={{ color: '#00d4cc', fontFamily: 'monospace' }}>
              WebIDE
            </span>
          </div>
        </div>
        <div className="px-6 py-8 text-center">
          <p className="text-sm mb-1 text-slate-400">Interactive Counter</p>
          <div className="text-6xl font-mono font-bold my-4" style={{ color: '#00d4cc' }}>
            {String(count).padStart(3, '0')}
          </div>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setCount(c => c - 1)}
              className="w-11 h-11 rounded-xl text-xl font-bold transition-all active:scale-95"
              style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
              −
            </button>
            <button onClick={() => setCount(0)}
              className="px-4 h-11 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(0,212,204,0.05)', border: '1px solid rgba(0,212,204,0.2)', color: '#6a8fae' }}>
              RESET
            </button>
            <button onClick={() => setCount(c => c + 1)}
              className="w-11 h-11 rounded-xl text-xl font-bold transition-all active:scale-95"
              style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
              +
            </button>
          </div>
        </div>
        <div className="px-6 py-3 text-center text-xs text-slate-600"
             style={{ borderTop: '1px solid rgba(0,212,204,0.1)' }}>
          Edit App.jsx to see live preview →
        </div>
      </div>
    </div>
  );
}
`,
  'style.css': `/* Custom styles */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
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
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
`,
};

// Re-export from fileSystem for backward compat
export { FILE_LANG as FILE_LANGUAGE_MAP, fileTemplate as FILE_TEMPLATES } from './fileSystem.js';
