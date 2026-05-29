/**
 * ConsolePanel.jsx — Displays console.log/warn/error captured from the iframe
 */
import { useRef, useEffect, useState } from 'react';
import useIDEStore from '../../store/useIDEStore';

const LEVEL_CONFIG = {
  log:   { icon: '›',  color: 'var(--ide-text)',    bg: 'transparent'              },
  info:  { icon: 'ℹ',  color: 'var(--ide-info)',    bg: 'rgba(96,165,250,0.04)'    },
  warn:  { icon: '⚠',  color: 'var(--ide-warn)',    bg: 'rgba(251,191,36,0.06)'    },
  error: { icon: '✕',  color: 'var(--ide-error)',   bg: 'rgba(248,113,113,0.06)'   },
  debug: { icon: '⬡',  color: 'var(--ide-textMuted)', bg: 'transparent'            },
};

function LogLine({ log }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = LEVEL_CONFIG[log.level] ?? LEVEL_CONFIG.log;
  const text = log.args?.join(' ') ?? '';
  const isMultiline = text.includes('\n') || text.length > 200;

  return (
    <div
      className="console-log-line"
      style={{ color: cfg.color, background: cfg.bg }}
      onClick={() => isMultiline && setExpanded(e => !e)}
    >
      {/* Level icon */}
      <span
        className="flex-shrink-0 font-mono text-xs w-3 text-center leading-5 select-none"
        style={{ color: cfg.color, opacity: 0.8 }}
      >
        {cfg.icon}
      </span>

      {/* Time */}
      <span
        className="flex-shrink-0 font-mono text-[10px] leading-5 tabular-nums"
        style={{ color: 'var(--ide-textDim)', width: 52 }}
      >
        {new Date(log.ts).toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>

      {/* Message */}
      <pre
        className="flex-1 font-mono text-[11px] leading-relaxed min-w-0 m-0"
        style={{
          whiteSpace:   expanded ? 'pre-wrap' : 'nowrap',
          overflow:     expanded ? 'visible' : 'hidden',
          textOverflow: expanded ? 'unset'   : 'ellipsis',
          cursor:       isMultiline ? 'pointer' : 'default',
          color:        cfg.color,
        }}
      >
        {text}
      </pre>

      {/* Expand indicator */}
      {isMultiline && (
        <span
          className="flex-shrink-0 text-[10px] ml-2 transition-transform"
          style={{
            color:     'var(--ide-textDim)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          ›
        </span>
      )}
    </div>
  );
}

export default function ConsolePanel({ style }) {
  const { consoleLogs, clearConsole, isConsoleOpen } = useIDEStore();
  const bottomRef = useRef(null);
  const [filter, setFilter] = useState('all');

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);

  if (!isConsoleOpen) return null;

  const filtered = filter === 'all'
    ? consoleLogs
    : consoleLogs.filter(l => l.level === filter);

  const counts = consoleLogs.reduce((acc, l) => {
    acc[l.level] = (acc[l.level] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className="flex flex-col border-t overflow-hidden flex-shrink-0"
      style={{ borderColor: 'var(--ide-border)', background: 'var(--ide-surface)', ...style }}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 h-8 flex-shrink-0 border-b"
        style={{ borderColor: 'var(--ide-border)', background: 'var(--ide-elevated)' }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--ide-textMuted)' }}
        >
          Console
        </span>

        {/* Log count badges */}
        {counts.error > 0 && (
          <Badge color="var(--ide-error)" bg="rgba(248,113,113,0.12)">{counts.error} error{counts.error > 1 ? 's' : ''}</Badge>
        )}
        {counts.warn > 0 && (
          <Badge color="var(--ide-warn)" bg="rgba(251,191,36,0.12)">{counts.warn} warn{counts.warn > 1 ? 's' : ''}</Badge>
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-0.5 ml-auto">
          {['all', 'log', 'info', 'warn', 'error'].map(level => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors uppercase"
              style={{
                background: filter === level ? 'rgba(0,212,204,0.12)' : 'transparent',
                color:      filter === level ? 'var(--ide-accent)' : 'var(--ide-textDim)',
                border:     `1px solid ${filter === level ? 'rgba(0,212,204,0.2)' : 'transparent'}`,
              }}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Clear button */}
        <button
          onClick={clearConsole}
          title="Clear console"
          className="ide-icon-btn w-5 h-5 rounded text-[10px] flex-shrink-0 ml-1"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M4.93 4.93l14.14 14.14"/>
          </svg>
        </button>
      </div>

      {/* ── Log Lines ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {filtered.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-[11px]"
            style={{ color: 'var(--ide-textDim)' }}
          >
            {consoleLogs.length > 0 ? `No ${filter} messages` : 'No console output yet. Run your code to see output here.'}
          </div>
        ) : (
          <>
            {filtered.map(log => (
              <LogLine key={log.id} log={log} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
}

function Badge({ children, color, bg }) {
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
      style={{ color, background: bg }}
    >
      {children}
    </span>
  );
}
