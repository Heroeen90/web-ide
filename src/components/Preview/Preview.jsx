/**
 * Preview.jsx v2 — Responsive preview modes: Mobile / Tablet / Desktop / Full
 */
import { useRef, useState } from 'react';
import useIDEStore from '../../store/useIDEStore';

const MODES = [
  { id:'mobile',  label:'📱', title:'Mobile (390px)',  width:390  },
  { id:'tablet',  label:'📟', title:'Tablet (768px)',  width:768  },
  { id:'desktop', label:'🖥️', title:'Desktop (1280px)', width:1280 },
  { id:'full',    label:'⬜', title:'Full Width',       width:null },
];

export default function Preview({ html, previewKey, onRun, isRunning, babelReady, style }) {
  const { settings, updateSetting } = useIDEStore();
  const iframeRef  = useRef(null);
  const [loaded,   setLoaded]   = useState(false);
  const [isFullscreen, setFullscreen] = useState(false);

  const modeId  = settings.previewTheme ?? 'full';
  const mode    = MODES.find(m => m.id === modeId) ?? MODES[3];

  function openNewTab() {
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }

  function toggleFullscreen() {
    setFullscreen(f => !f);
  }

  const containerStyle = isFullscreen
    ? { position:'fixed', inset:0, zIndex:1000, display:'flex', flexDirection:'column', background:'#0d1929' }
    : { display:'flex', flexDirection:'column', border:'none', borderLeft:'1px solid #1e3a5c', ...style };

  return (
    <div style={containerStyle}>
      {/* ── Toolbar ────────────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', gap:6, padding:'0 10px',
        height:38, flexShrink:0, background:'#0d1f35', borderBottom:'1px solid #1e3a5c',
      }}>
        {/* Status dot */}
        <span style={{
          width:7, height:7, borderRadius:'50%', flexShrink:0,
          background: isRunning ? '#fbbf24' : loaded ? '#34d399' : '#3d6080',
          animation: isRunning ? 'pulse 1s infinite' : 'none',
        }} />
        <span style={{ fontSize:11, color:'#6a8fae', flex:1 }}>
          {isRunning ? 'Building…' : 'Preview'}
        </span>

        {/* Device mode selector */}
        <div style={{ display:'flex', gap:2 }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => updateSetting('previewTheme', m.id)}
              title={m.title}
              style={{
                background: modeId === m.id ? 'rgba(0,212,204,0.15)' : 'transparent',
                border: `1px solid ${modeId === m.id ? 'rgba(0,212,204,0.4)' : 'transparent'}`,
                borderRadius:4, padding:'2px 6px', color: modeId === m.id ? '#00d4cc' : '#6a8fae',
                fontSize:13, cursor:'pointer', transition:'all .15s',
              }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <PBtn onClick={onRun} title="Refresh" disabled={!babelReady || isRunning}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </PBtn>

        {/* New Tab */}
        <PBtn onClick={openNewTab} title="Open in New Tab" disabled={!html}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </PBtn>

        {/* Fullscreen */}
        <PBtn onClick={toggleFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
          {isFullscreen ? '⊠' : '⊞'}
        </PBtn>
      </div>

      {/* ── iframe container ───────────────────────────────── */}
      <div style={{ flex:1, overflow:'auto', background:'#e5e7eb', position:'relative', display:'flex', justifyContent:'center', alignItems:'flex-start' }}>
        {/* Running overlay */}
        {isRunning && (
          <div style={{ position:'absolute', inset:0, zIndex:10, background:'rgba(7,13,25,0.7)', backdropFilter:'blur(4px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d4cc" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <span style={{ color:'#00d4cc', fontSize:12, fontFamily:'monospace' }}>Building…</span>
          </div>
        )}

        {/* No preview state */}
        {!html && !isRunning && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:12, color:'#6a8fae', background:'#070d19', position:'absolute', inset:0 }}>
            <span style={{ fontSize:40, opacity:.3 }}>🖥️</span>
            <p style={{ fontSize:13 }}>No preview yet</p>
            <button onClick={onRun} disabled={!babelReady} style={{
              padding:'7px 18px', borderRadius:8, border:'none',
              background:'#00d4cc', color:'#070d19', fontWeight:700, fontSize:12, cursor:'pointer',
              opacity: babelReady ? 1 : 0.5,
            }}>▶ Run</button>
          </div>
        )}

        {/* iframe — with responsive frame */}
        {html && (
          <div style={{
            width:  mode.width ? Math.min(mode.width, '100%') : '100%',
            height: '100%',
            maxWidth: mode.width ?? '100%',
            margin: mode.width ? '0 auto' : 0,
            boxShadow: mode.width ? '0 0 40px #00000040' : 'none',
            background:'#fff',
            transition: 'width .3s ease, max-width .3s ease',
            flexShrink: 0,
            position: 'relative',
          }}>
            {/* Device label */}
            {mode.width && (
              <div style={{ position:'absolute', top:-20, left:0, right:0, textAlign:'center', fontSize:9, color:'#6a8fae', fontFamily:'monospace' }}>
                {mode.title}
              </div>
            )}
            <iframe
              key={previewKey}
              ref={iframeRef}
              srcDoc={html}
              sandbox="allow-scripts allow-forms allow-popups allow-modals allow-pointer-lock"
              title="Preview"
              onLoad={() => setLoaded(true)}
              style={{ width:'100%', height:'100%', border:'none', display:'block' }}
            />
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}`}</style>
    </div>
  );
}

function PBtn({ onClick, title, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      background:'transparent', border:'none', color: disabled ? '#3d6080' : '#6a8fae',
      cursor: disabled ? 'not-allowed' : 'pointer', padding:'4px 5px', borderRadius:4,
      fontSize:14, transition:'color .15s', lineHeight:1,
    }}
    onMouseEnter={e => !disabled && (e.target.style.color='#dde8f5')}
    onMouseLeave={e => (e.target.style.color = disabled ? '#3d6080' : '#6a8fae')}
    >{children}</button>
  );
}
