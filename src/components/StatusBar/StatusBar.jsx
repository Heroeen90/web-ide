/**
 * StatusBar.jsx — Bottom status bar (VS Code-style)
 */
import useIDEStore from '../../store/useIDEStore';
import { FILE_LANGUAGE_MAP } from '../../utils/defaultFiles';

const LANG_DISPLAY = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  css:        'CSS',
  html:       'HTML',
  json:       'JSON',
  markdown:   'Markdown',
  xml:        'XML',
  plaintext:  'Plain Text',
};

function getExt(name)  { return name.split('.').pop().toLowerCase(); }
function getLang(name) { return FILE_LANGUAGE_MAP[getExt(name)] ?? 'plaintext'; }

export default function StatusBar({ babelReady, isRunning }) {
  const {
    activeFile, files,
    fontSize, wordWrap,
    autoRefresh, consoleLogs,
  } = useIDEStore();

  const language   = activeFile ? getLang(activeFile) : 'plaintext';
  const langLabel  = LANG_DISPLAY[language] ?? language;
  const fileSize   = activeFile && files[activeFile]
    ? formatBytes(new TextEncoder().encode(files[activeFile]).length)
    : '—';
  const lineCount  = activeFile && files[activeFile]
    ? files[activeFile].split('\n').length
    : 0;
  const errorCount = consoleLogs.filter(l => l.level === 'error').length;
  const warnCount  = consoleLogs.filter(l => l.level === 'warn').length;

  return (
    <div
      className="flex items-center justify-between px-3 h-6 flex-shrink-0 select-none"
      style={{
        background:    '#0a1628',
        borderTop:     '1px solid var(--ide-border)',
        color:         'var(--ide-textDim)',
        fontSize:      '11px',
        fontFamily:    'var(--font-mono)',
      }}
    >
      {/* ── Left side ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Babel status */}
        <StatusPill
          color={babelReady ? 'var(--ide-success)' : 'var(--ide-warn)'}
          dot
        >
          {babelReady ? 'Babel Ready' : 'Loading Babel…'}
        </StatusPill>

        {/* Running indicator */}
        {isRunning && (
          <StatusPill color="var(--ide-warn)" dot>
            Building
          </StatusPill>
        )}

        {/* Auto-refresh */}
        <span style={{ color: autoRefresh ? 'var(--ide-accent)' : 'var(--ide-textDim)' }}>
          ⟳ {autoRefresh ? 'Auto' : 'Manual'}
        </span>
      </div>

      {/* ── Right side ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Console counts */}
        {errorCount > 0 && (
          <span style={{ color: 'var(--ide-error)' }}>✕ {errorCount}</span>
        )}
        {warnCount > 0 && (
          <span style={{ color: 'var(--ide-warn)' }}>⚠ {warnCount}</span>
        )}

        {/* File info */}
        {activeFile && (
          <>
            <span>{lineCount} L</span>
            <span>{fileSize}</span>
            <Divider />
            <span>Spaces: 2</span>
            <span>UTF-8</span>
            <Divider />
            <span style={{ color: 'var(--ide-accent)' }}>{langLabel}</span>
            <Divider />
            <span>Fs: {fontSize}px</span>
            {wordWrap && <span style={{ color: 'var(--ide-accent)' }}>Wrap</span>}
          </>
        )}

        <Divider />
        <span style={{ color: 'var(--ide-textDim)', opacity: 0.6 }}>WebIDE v1.0</span>
      </div>
    </div>
  );
}

function Divider() {
  return <span style={{ opacity: 0.3 }}>│</span>;
}

function StatusPill({ children, color, dot }) {
  return (
    <span className="flex items-center gap-1" style={{ color }}>
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      )}
      {children}
    </span>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
