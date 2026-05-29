/**
 * Preview.jsx — Live preview iframe sandboxed panel
 */
import { useRef, useState } from 'react';

export default function Preview({ html, previewKey, onRun, isRunning, babelReady, style }) {
  const iframeRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  function handleLoad() { setIsLoaded(true); }

  function openInNewTab() {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  function refreshPreview() {
    setIsLoaded(false);
    onRun();
  }

  return (
    <div
      className="flex flex-col border-l overflow-hidden"
      style={{ background: 'var(--ide-surface)', borderColor: 'var(--ide-border)', ...style }}
    >
      {/* ── Preview Toolbar ────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 h-9 flex-shrink-0 border-b"
        style={{ borderColor: 'var(--ide-border)', background: 'var(--ide-elevated)' }}
      >
        {/* Status indicator */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${isRunning ? 'pulse-dot' : ''}`}
            style={{ background: isRunning ? 'var(--ide-warn)' : isLoaded ? 'var(--ide-success)' : 'var(--ide-textDim)' }}
          />
          <span className="text-[11px] font-medium truncate" style={{ color: 'var(--ide-textMuted)' }}>
            {isRunning ? 'Compiling…' : 'Preview'}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Refresh */}
          <PreviewBtn onClick={refreshPreview} title="Refresh Preview" disabled={isRunning || !babelReady}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </PreviewBtn>

          {/* Open in new tab */}
          <PreviewBtn onClick={openInNewTab} title="Open in New Tab" disabled={!html}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </PreviewBtn>
        </div>
      </div>

      {/* ── iframe ────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden" style={{ background: '#fff' }}>
        {/* Loading overlay */}
        {isRunning && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{ background: 'rgba(7,13,25,0.7)', backdropFilter: 'blur(2px)' }}
          >
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24"
                   fill="none" stroke="var(--ide-accent)" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83
                         M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <span className="text-xs font-mono" style={{ color: 'var(--ide-accent)' }}>Building…</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!html && !isRunning && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'var(--ide-bg)' }}
          >
            <div className="text-center">
              <div className="text-4xl mb-3 opacity-20">🖥️</div>
              <p className="text-sm" style={{ color: 'var(--ide-textDim)' }}>No preview yet</p>
              <button
                onClick={onRun}
                disabled={!babelReady}
                className="mt-3 px-4 py-1.5 rounded text-xs font-medium transition-all"
                style={{
                  background: 'var(--ide-accent)',
                  color:      '#070d19',
                  opacity:    babelReady ? 1 : 0.5,
                }}
              >
                ▶ Run
              </button>
            </div>
          </div>
        )}

        <iframe
          key={previewKey}
          ref={iframeRef}
          srcDoc={html}
          sandbox="allow-scripts allow-forms allow-popups allow-modals allow-pointer-lock"
          title="Preview"
          onLoad={handleLoad}
          className="w-full h-full border-0"
          style={{ display: html ? 'block' : 'none' }}
        />
      </div>
    </div>
  );
}

function PreviewBtn({ onClick, title, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="ide-icon-btn w-6 h-6 rounded"
    >
      {children}
    </button>
  );
}
