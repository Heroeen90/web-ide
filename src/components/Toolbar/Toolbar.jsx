/**
 * Toolbar.jsx v2 — Professional top toolbar
 */
import { useRef, useState } from 'react';
import useIDEStore from '../../store/useIDEStore';
import { importZIP, readUploadedFiles } from '../../utils/zipHandler';

export default function Toolbar({ onRun, isRunning, babelReady }) {
  const {
    projectName, setProjectName,
    settings, updateSetting,
    openSettings,
    exportProjectZIP, exportProjectJSON,
    loadProject, resetProject, addFiles,
    toggleSidebar, toggleConsole, togglePreview,
    isSidebarOpen, isConsoleOpen, isPreviewOpen,
  } = useIDEStore();

  const [editName,  setEditName]  = useState(false);
  const [nameDraft, setNameDraft] = useState(projectName);
  const [showExport, setShowExport] = useState(false);
  const fileInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  function commitName() {
    const t = nameDraft.trim();
    if (t) setProjectName(t); else setNameDraft(projectName);
    setEditName(false);
  }

  async function handleUpload(e) {
    const files = e.target.files;
    if (!files?.length) return;
    if (files.length === 1 && files[0].name.endsWith('.zip')) {
      const data = await importZIP(files[0]);
      loadProject(data);
    } else {
      const newFiles = await readUploadedFiles(files);
      addFiles(newFiles);
    }
    e.target.value = '';
  }

  function handleJSONImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.files) loadProject(data);
        else alert('Invalid .webide.json file');
      } catch { alert('Could not parse file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const divider = <div style={{ width:1, height:22, background:'#1e3a5c', flexShrink:0 }} />;

  return (
    <div style={{
      display:'flex', alignItems:'center', height:48, padding:'0 12px', gap:6,
      background:'#0a1628', borderBottom:'1px solid #1e3a5c', flexShrink:0,
      position:'relative', zIndex:10,
    }}>
      {/* Brand */}
      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0, marginRight:4 }}>
        <span style={{ fontSize:20 }}>⚡</span>
        <span style={{ color:'#00d4cc', fontWeight:900, fontSize:14, fontFamily:'monospace', letterSpacing:'-0.5px' }}>WebIDE</span>
      </div>

      {divider}

      {/* Run Button */}
      <button onClick={onRun} disabled={!babelReady || isRunning}
        title={babelReady ? 'Run (Ctrl+Enter)' : 'Loading Babel…'}
        style={{
          display:'flex', alignItems:'center', gap:6, padding:'0 14px', height:30,
          borderRadius:8, border:'none', fontWeight:700, fontSize:12, cursor:'pointer',
          flexShrink:0, transition:'all .15s',
          background: babelReady && !isRunning ? '#00d4cc' : '#122033',
          color:      babelReady && !isRunning ? '#070d19' : '#6a8fae',
          boxShadow:  babelReady && !isRunning ? '0 0 14px rgba(0,212,204,.3)' : 'none',
          opacity:    !babelReady || isRunning ? 0.7 : 1,
        }}>
        {isRunning
          ? <><Spin/> Building…</>
          : babelReady
            ? <><svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor"><path d="M1 1l7 4-7 4V1z"/></svg> Run</>
            : <><Spin/> Loading…</>
        }
      </button>

      {/* Auto-refresh toggle */}
      <button onClick={() => updateSetting('autoRefresh', !settings.autoRefresh)}
        title={`Auto-refresh: ${settings.autoRefresh ? 'ON' : 'OFF'}`}
        style={{
          display:'flex', alignItems:'center', gap:4, padding:'4px 10px', height:28,
          borderRadius:6, border:`1px solid ${settings.autoRefresh ? 'rgba(0,212,204,.4)' : '#1e3a5c'}`,
          background: settings.autoRefresh ? 'rgba(0,212,204,.08)' : 'transparent',
          color:      settings.autoRefresh ? '#00d4cc' : '#6a8fae',
          fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0,
        }}>
        ⟳ Auto
      </button>

      {divider}

      {/* Project name */}
      <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {editName ? (
          <input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setNameDraft(projectName); setEditName(false); } }}
            style={{ background:'transparent', border:'none', borderBottom:'1px solid #00d4cc', color:'#dde8f5', fontSize:13, fontWeight:600, textAlign:'center', outline:'none', width:200, padding:'2px 4px' }}
          />
        ) : (
          <span onDoubleClick={() => { setNameDraft(projectName); setEditName(true); }}
            title="Double-click to rename"
            style={{ color:'#6a8fae', fontSize:13, fontWeight:500, cursor:'pointer', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>
            {projectName}
          </span>
        )}
      </div>

      {divider}

      {/* Upload */}
      <TBtn onClick={() => fileInputRef.current?.click()} title="Upload Files or ZIP">
        ⬆ Upload
      </TBtn>

      {/* Export dropdown */}
      <div style={{ position:'relative' }}>
        <TBtn onClick={() => setShowExport(v => !v)} title="Export project">
          ⬇ Export
        </TBtn>
        {showExport && (
          <div style={{ position:'absolute', top:32, right:0, background:'#0d1929', border:'1px solid #1e3a5c', borderRadius:8, overflow:'hidden', minWidth:160, zIndex:100, boxShadow:'0 8px 24px #00000060' }}
               onMouseLeave={() => setShowExport(false)}>
            {[
              { label:'📦 Export ZIP',        action: () => { exportProjectZIP(); setShowExport(false); } },
              { label:'📄 Export JSON',        action: () => { exportProjectJSON(); setShowExport(false); } },
              { label:'📥 Import JSON',        action: () => { jsonInputRef.current?.click(); setShowExport(false); } },
              { label:'🔄 Reset to Default',   action: () => { if (confirm('Reset project?')) { resetProject(); setShowExport(false); } }, danger: true },
            ].map(item => (
              <button key={item.label} onClick={item.action} style={{
                display:'block', width:'100%', padding:'9px 14px', background:'transparent',
                border:'none', color: item.danger ? '#f87171' : '#dde8f5', fontSize:12, textAlign:'right',
                cursor:'pointer', fontFamily:'Cairo, sans-serif',
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.target.style.background = 'transparent'}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {divider}

      {/* Layout toggles */}
      <div style={{ display:'flex', gap:2 }}>
        <LayoutBtn active={isSidebarOpen}  onClick={toggleSidebar}  title="Toggle Sidebar"  >⊞ Files</LayoutBtn>
        <LayoutBtn active={isConsoleOpen}  onClick={toggleConsole}  title="Toggle Console"  >⊟ Console</LayoutBtn>
        <LayoutBtn active={isPreviewOpen}  onClick={togglePreview}  title="Toggle Preview"  >⊠ Preview</LayoutBtn>
      </div>

      {divider}

      {/* Settings */}
      <button onClick={openSettings} title="Settings" style={{
        background:'transparent', border:'none', color:'#6a8fae', cursor:'pointer',
        fontSize:18, padding:'4px 5px', borderRadius:5, lineHeight:1, flexShrink:0,
      }} onMouseEnter={e=>e.target.style.color='#dde8f5'} onMouseLeave={e=>e.target.style.color='#6a8fae'}>
        ⚙
      </button>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" multiple accept="*" style={{ display:'none' }} onChange={handleUpload} />
      <input ref={jsonInputRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleJSONImport} />
    </div>
  );
}

function TBtn({ onClick, title, children }) {
  return (
    <button onClick={onClick} title={title} style={{
      display:'flex', alignItems:'center', gap:4, padding:'4px 10px', height:28,
      borderRadius:6, border:'1px solid #1e3a5c', background:'transparent',
      color:'#6a8fae', fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0, transition:'all .15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.color='#dde8f5'; e.currentTarget.style.borderColor='#2a4d78'; }}
    onMouseLeave={e => { e.currentTarget.style.color='#6a8fae'; e.currentTarget.style.borderColor='#1e3a5c'; }}
    >{children}</button>
  );
}

function LayoutBtn({ active, onClick, title, children }) {
  return (
    <button onClick={onClick} title={title} style={{
      padding:'4px 8px', height:28, borderRadius:5, border:'none', fontSize:11, fontWeight:600,
      background: active ? 'rgba(0,212,204,0.1)' : 'transparent',
      color:      active ? '#00d4cc' : '#6a8fae',
      cursor:'pointer', transition:'all .15s', flexShrink:0,
    }}>
      {children}
    </button>
  );
}

function Spin() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
         style={{ animation:'spin .7s linear infinite' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </svg>
  );
}

