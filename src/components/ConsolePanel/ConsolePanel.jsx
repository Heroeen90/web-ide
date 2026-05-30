/**
 * ConsolePanel.jsx v2 — Professional console with filters, search, timestamps
 */
import { useRef, useEffect, useState, useMemo } from 'react';
import useIDEStore from '../../store/useIDEStore';

const LEVELS = {
  log:   { color:'#dde8f5', bg:'transparent',              icon:'›',  label:'LOG'   },
  info:  { color:'#60a5fa', bg:'rgba(96,165,250,0.04)',    icon:'ℹ',  label:'INFO'  },
  warn:  { color:'#fbbf24', bg:'rgba(251,191,36,0.06)',    icon:'⚠',  label:'WARN'  },
  error: { color:'#f87171', bg:'rgba(248,113,113,0.07)',   icon:'✕',  label:'ERROR' },
  debug: { color:'#6a8fae', bg:'transparent',              icon:'◇',  label:'DEBUG' },
};

function fmt(ts) {
  return new Date(ts).toLocaleTimeString('en', { hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

function LogLine({ log }) {
  const [expanded, setExpanded] = useState(false);
  const cfg  = LEVELS[log.level] ?? LEVELS.log;
  const text = log.args?.join('  ') ?? '';
  const long = text.includes('\n') || text.length > 160;

  return (
    <div
      onClick={() => long && setExpanded(e => !e)}
      style={{
        display:'flex', gap:8, padding:'4px 12px',
        borderBottom:'1px solid rgba(30,58,92,0.25)',
        background:cfg.bg, cursor:long?'pointer':'default',
        alignItems:'flex-start',
        transition:'background .1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background=cfg.bg}
    >
      {/* Level icon */}
      <span style={{ color:cfg.color, fontFamily:'monospace', fontSize:11, width:12, flexShrink:0, paddingTop:1 }}>
        {cfg.icon}
      </span>
      {/* Timestamp */}
      <span style={{ color:'#3d6080', fontFamily:'monospace', fontSize:10, flexShrink:0, paddingTop:2, width:56 }}>
        {log.ts ? fmt(log.ts) : ''}
      </span>
      {/* Message */}
      <pre style={{
        flex:1, margin:0, fontFamily:'monospace', fontSize:11, lineHeight:1.6,
        color:cfg.color, whiteSpace:expanded?'pre-wrap':'nowrap',
        overflow:expanded?'visible':'hidden', textOverflow:expanded?'unset':'ellipsis',
        wordBreak:'break-all',
      }}>{text}</pre>
      {/* Expand chevron */}
      {long && (
        <span style={{ color:'#3d6080', fontSize:10, flexShrink:0, paddingTop:2, transform:expanded?'rotate(90deg)':'none', transition:'transform .15s' }}>›</span>
      )}
    </div>
  );
}

export default function ConsolePanel({ style }) {
  const { consoleLogs, clearConsole } = useIDEStore();
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [consoleLogs]);

  const filtered = useMemo(() => {
    let logs = filter === 'all' ? consoleLogs : consoleLogs.filter(l => l.level === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      logs = logs.filter(l => l.args?.join(' ').toLowerCase().includes(q));
    }
    return logs;
  }, [consoleLogs, filter, search]);

  const counts = useMemo(() =>
    consoleLogs.reduce((a, l) => { a[l.level] = (a[l.level]||0)+1; return a; }, {}),
  [consoleLogs]);

  const totalErrors = counts.error ?? 0;
  const totalWarns  = counts.warn  ?? 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', background:'#0a1420', borderTop:'1px solid #1e3a5c', overflow:'hidden', ...style }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'0 10px', height:32, flexShrink:0, background:'#0d1f35', borderBottom:'1px solid #1e3a5c' }}>
        <span style={{ color:'#6a8fae', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', flexShrink:0 }}>Console</span>

        {/* Error/Warn badges */}
        {totalErrors > 0 && <Pill color="#f87171" bg="rgba(248,113,113,0.12)">{totalErrors} {totalErrors===1?'error':'errors'}</Pill>}
        {totalWarns  > 0 && <Pill color="#fbbf24" bg="rgba(251,191,36,0.12)">{totalWarns} {totalWarns===1?'warn':'warns'}</Pill>}

        {/* Search */}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          style={{ background:'#122033', border:'1px solid #1e3a5c', borderRadius:4, padding:'2px 7px', color:'#8bacc8', fontSize:10, outline:'none', width:100, flexShrink:0 }}
        />

        {/* Filters */}
        <div style={{ display:'flex', gap:2, marginLeft:'auto' }}>
          {['all','log','info','warn','error'].map(lvl => (
            <button key={lvl} onClick={() => setFilter(lvl)} style={{
              padding:'2px 6px', borderRadius:4, border:`1px solid ${filter===lvl?'rgba(0,212,204,.3)':'transparent'}`,
              background: filter===lvl?'rgba(0,212,204,.1)':'transparent',
              color:      filter===lvl?'#00d4cc':'#6a8fae',
              fontSize:9, fontWeight:700, cursor:'pointer', textTransform:'uppercase',
            }}>{lvl}</button>
          ))}
        </div>

        {/* Clear */}
        <button onClick={clearConsole} title="Clear console" style={{ background:'transparent', border:'none', color:'#6a8fae', cursor:'pointer', fontSize:14, padding:'2px 4px', lineHeight:1 }}
          onMouseEnter={e=>e.target.style.color='#f87171'} onMouseLeave={e=>e.target.style.color='#6a8fae'}>
          ✕
        </button>
      </div>

      {/* Logs */}
      <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
        {filtered.length === 0 ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#3d6080', fontSize:11, gap:6 }}>
            {consoleLogs.length===0 ? '⬛ No output yet — Run your code' : `No ${filter} messages`}
          </div>
        ) : (
          <>
            {filtered.map(log => <LogLine key={log.id} log={log} />)}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
}

function Pill({ color, bg, children }) {
  return (
    <span style={{ padding:'1px 6px', borderRadius:4, background:bg, color, fontSize:9, fontWeight:700, flexShrink:0 }}>
      {children}
    </span>
  );
}
