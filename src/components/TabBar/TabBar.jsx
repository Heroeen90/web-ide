/**
 * TabBar.jsx v2 — Scrollable tabs with close, icons, unsaved indicator
 */
import { useRef, useEffect } from 'react';
import useIDEStore from '../../store/useIDEStore';
import { fileIcon, fileLang, LANG_COLOR, pathBasename, pathExtname } from '../../utils/fileSystem';

export default function TabBar() {
  const { openTabs, activeFile, openFile, closeTab } = useIDEStore();
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block:'nearest', inline:'center', behavior:'smooth' });
  }, [activeFile]);

  if (!openTabs.length) return (
    <div style={{ height:38, background:'#0a1420', borderBottom:'1px solid #1e3a5c', display:'flex', alignItems:'center', padding:'0 12px' }}>
      <span style={{ color:'#3d6080', fontSize:11 }}>No files open — select a file from the explorer</span>
    </div>
  );

  return (
    <div
      ref={scrollRef}
      style={{
        display:'flex', alignItems:'stretch', height:38, flexShrink:0,
        background:'#0a1420', borderBottom:'1px solid #1e3a5c',
        overflowX:'auto', overflowY:'hidden',
      }}
    >
      {openTabs.map(path => {
        const isActive = path === activeFile;
        const name     = pathBasename(path);
        const ext      = pathExtname(path);
        const lang     = fileLang(path);
        const dot      = LANG_COLOR[lang] ?? '#3d6080';
        const icon     = fileIcon(name);

        return (
          <div
            key={path}
            data-active={isActive}
            onClick={() => openFile(path)}
            title={path}
            style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'0 10px', cursor:'pointer', flexShrink:0,
              maxWidth:160, minWidth:80,
              background:    isActive ? '#070d19' : 'transparent',
              borderBottom:  isActive ? '2px solid #00d4cc' : '2px solid transparent',
              borderRight:   '1px solid #1e3a5c',
              color:         isActive ? '#dde8f5' : '#6a8fae',
              transition:    'color .15s, background .15s',
              position:      'relative',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Lang dot */}
            <span style={{ width:6, height:6, borderRadius:'50%', background:dot, flexShrink:0 }} />

            {/* File icon + name */}
            <span style={{ fontSize:12 }}>{icon}</span>
            <span style={{ fontSize:11, fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
              {name}
            </span>

            {/* Close button */}
            <button
              onClick={e => { e.stopPropagation(); closeTab(path); }}
              style={{
                background:'transparent', border:'none', color:'#6a8fae',
                cursor:'pointer', padding:'2px 3px', borderRadius:3,
                fontSize:11, lineHeight:1, flexShrink:0, opacity:0,
                transition:'opacity .15s',
              }}
              onMouseEnter={e => { e.target.style.color='#f87171'; e.target.style.opacity=1; }}
              onMouseLeave={e => { e.target.style.color='#6a8fae'; }}
            >✕</button>
          </div>
        );
      })}

      {/* Filler */}
      <div style={{ flex:1, borderBottom:'2px solid transparent' }} />

      <style>{`
        [data-active="true"] button { opacity: 1 !important; }
        div:hover > button { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
