/**
 * App.jsx v3 — Main IDE shell with Smart Multi-Project Client Preview Mode
 * ✅ Embedded URL-Router to hide IDE from clients (?preview=true)
 * ✅ Desktop: resizable panels (sidebar, preview, console)
 * ✅ Mobile: bottom-tab navigation with 4 panels
 * ✅ Settings modal
 * ✅ Smart auto-refresh (only on valid code)
 * ✅ Drag-resize handles
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import useIDEStore          from './store/useIDEStore';
import Toolbar              from './components/Toolbar/Toolbar';
import FileExplorer         from './components/FileExplorer/FileExplorer';
import TabBar               from './components/TabBar/TabBar';
import CodeEditor           from './components/Editor/CodeEditor';
import Preview              from './components/Preview/Preview';
import ConsolePanel         from './components/ConsolePanel/ConsolePanel';
import StatusBar            from './components/StatusBar/StatusBar';
import Settings             from './components/Settings/Settings';
import { generatePreviewHTML } from './utils/htmlGenerator';
import { waitForBabel }        from './utils/transpiler';

// ─── Mobile detection ────────────────────────────────────────────────────────
function useIsMobile() {
  const [mob, setMob] = useState(window.innerWidth < 900);
  useEffect(() => {
    const h = () => setMob(window.innerWidth < 900);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mob;
}

const MOBILE_TABS = [
  { id:'files',   icon:'📁', label:'ملفات'  },
  { id:'code',    icon:'✏️', label:'كود'    },
  { id:'preview', icon:'▶',  label:'معاينة' },
  { id:'console', icon:'⬛', label:'Console'},
];

// ─── Drag resize hook ────────────────────────────────────────────────────────
function useDragResize(onMove) {
  return useCallback(e => {
    e.preventDefault();
    const move = ev => onMove(ev);
    const up   = ()  => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, [onMove]);
}

// ─── Resize handle component ─────────────────────────────────────────────────
function ResizeHandle({ direction = 'col', onMouseDown }) {
  const [hovered, setHovered] = useState(false);
  const isCol = direction === 'col';
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink:  0,
        cursor:      isCol ? 'col-resize' : 'row-resize',
        background:  hovered ? '#00d4cc' : 'transparent',
        opacity:     hovered ? 0.5 : 1,
        transition:  'background .15s, opacity .15s',
        ...(isCol ? { width:4, height:'100%' } : { height:4, width:'100%' }),
      }}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const {
    files,
    isSidebarOpen, sidebarWidth,   setSidebarWidth,
    isConsoleOpen, consoleHeight,   setConsoleHeight,
    isPreviewOpen, previewPercent,  setPreviewPercent,
    isSettingsOpen,
    settings,
    addLog, clearConsole,
  } = useIDEStore();

  const isMobile    = useIsMobile();
  const [mobileTab, setMobileTab] = useState('code');
  const [previewHTML, setPreviewHTML] = useState('');
  const [previewKey,  setPreviewKey]  = useState(0);
  const [babelReady,  setBabelReady]  = useState(!!window.Babel);
  const [isRunning,   setIsRunning]   = useState(false);

  // 🛡️ فحص الرابط للتحقق مما إذا كان الزائر هو "الزبون" لعرض المشروع له فقط وممتداً على كامل الشاشة
  const [isClientPreviewMode, setIsClientPreviewMode] = useState(false);
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('preview') === 'true') {
      setIsClientPreviewMode(true);
    }
  }, []);

  const timerRef  = useRef(null);
  const filesRef  = useRef(files);
  useEffect(() => { filesRef.current = files; }, [files]);

  // ── Wait for Babel CDN ─────────────────────────────────────────────────
  useEffect(() => {
    if (window.Babel) { setBabelReady(true); return; }
    waitForBabel().then(() => setBabelReady(true)).catch(console.error);
  }, []);

  // ── Core: generate preview ─────────────────────────────────────────────
  const runPreview = useCallback((force = false) => {
    try {
      setIsRunning(true);
      const { html, hasErrors } = generatePreviewHTML(filesRef.current);
      if (!hasErrors || force) {
        clearConsole();
        setPreviewHTML(html);
        setPreviewKey(k => k + 1);
      }
    } catch (err) {
      console.error('[WebIDE]', err);
    } finally {
      setIsRunning(false);
    }
  }, [clearConsole]);

  // ── Auto-refresh (debounced) ───────────────────────────────────────────
  useEffect(() => {
    if (!settings.autoRefresh || !babelReady) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runPreview(false), isMobile ? 2500 : 800);
    return () => clearTimeout(timerRef.current);
  }, [files, settings.autoRefresh, babelReady, isMobile]); // eslint-disable-line

  // ── Initial run ────────────────────────────────────────────────────────
  useEffect(() => { if (babelReady) runPreview(true); }, [babelReady]); // eslint-disable-line

  // ── Console messages from iframe ───────────────────────────────────────
  useEffect(() => {
    const h = e => { if (e.data?.type === 'console') addLog(e.data); };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, [addLog]);

  // ── Drag resize callbacks ──────────────────────────────────────────────
  const previewRef  = useRef(null);
  const startSidebar = useDragResize(useCallback(e =>
    setSidebarWidth(prev => Math.max(160, Math.min(480, prev + e.movementX))), [setSidebarWidth]));
  const startPreview = useDragResize(useCallback(e => {
    const total = previewRef.current?.parentElement?.clientWidth ?? 1000;
    setPreviewPercent(prev => Math.max(20, Math.min(70, prev - (e.movementX / total) * 100)));
  }, [setPreviewPercent]));
  const startConsole = useDragResize(useCallback(e =>
    setConsoleHeight(prev => Math.max(80, Math.min(500, prev - e.movementY))), [setConsoleHeight]));

  const sharedPreviewProps = { html:previewHTML, previewKey, onRun:() => runPreview(true), isRunning, babelReady };

  // ══════════════════════════════════════════════════════════════════════
  // 🌟 وضع العرض المخصص للزبائن (Client Preview Mode) 🌟
  // يخفي بيئة التطوير تماماً ويعرض المعاينة على كامل شاشة اللمس للهاتف أو الكمبيوتر
  // ══════════════════════════════════════════════════════════════════════
  if (isClientPreviewMode) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#070d19', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Preview {...sharedPreviewProps} style={{ flex: 1, width: '100%', height: '100%', border: 'none' }} />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // Mobile layout (Developer)
  // ══════════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:'#070d19', overflow:'hidden' }}>
        <MobileHeader onRun={() => runPreview(true)} isRunning={isRunning} babelReady={babelReady} />

        {/* Content */}
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', minHeight:0 }}>
          {mobileTab === 'files'   && <FileExplorer style={{ flex:1, width:'100%', border:'none' }} />}
          {mobileTab === 'code'    && <CodeEditor />}
          {mobileTab === 'preview' && <Preview {...sharedPreviewProps} style={{ flex:1, border:'none' }} />}
          {mobileTab === 'console' && <ConsolePanel style={{ flex:1, height:'100%', border:'none' }} />}
        </div>

        {/* Bottom tabs */}
        <nav style={{
          display:'grid', gridTemplateColumns:'repeat(4,1fr)',
          background:'#0a1628', borderTop:'1px solid #1e3a5c', flexShrink:0,
        }}>
          {MOBILE_TABS.map(tab => (
            <button key={tab.id} onClick={() => setMobileTab(tab.id)} style={{
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              gap:2, padding:'7px 4px', border:'none', cursor:'pointer',
              background:    mobileTab === tab.id ? 'rgba(0,212,204,.1)' : 'transparent',
              borderTop:     mobileTab === tab.id ? '2px solid #00d4cc' : '2px solid transparent',
              color:         mobileTab === tab.id ? '#00d4cc' : '#6a8fae',
              fontSize:9, fontWeight:700, letterSpacing:'.05em', fontFamily:'Cairo,sans-serif',
            }}>
              <span style={{ fontSize:18, lineHeight:1 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {isSettingsOpen && <Settings />}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // Desktop layout (Developer)
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'#070d19', color:'#dde8f5' }}>
      <Toolbar onRun={() => runPreview(true)} isRunning={isRunning} babelReady={babelReady} />

      <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>
        {/* Sidebar */}
        {isSidebarOpen && (
          <>
            <FileExplorer style={{ width:sidebarWidth, flexShrink:0 }} />
            <ResizeHandle direction="col" onMouseDown={startSidebar} />
          </>
        )}

        {/* Editor + Console column */}
        <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', minWidth:0 }}>
          <TabBar />

          <div ref={previewRef} style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>
            {/* Editor + Console */}
            <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', minWidth:0 }}>
              <div style={{ flex:1, overflow:'hidden', minHeight:0 }}>
                <CodeEditor />
              </div>
              {isConsoleOpen && (
                <>
                  <ResizeHandle direction="row" onMouseDown={startConsole} />
                  <ConsolePanel style={{ height:consoleHeight, flexShrink:0 }} />
                </>
              )}
            </div>

            {/* Preview */}
            {isPreviewOpen && (
              <>
                <ResizeHandle direction="col" onMouseDown={startPreview} />
                <Preview {...sharedPreviewProps} style={{ width:`${previewPercent}%`, flexShrink:0 }} />
              </>
            )}
          </div>
        </div>
      </div>

      <StatusBar babelReady={babelReady} isRunning={isRunning} />
      {isSettingsOpen && <Settings />}
    </div>
  );
}

// ─── Compact mobile header ────────────────────────────────────────────────────
function MobileHeader({ onRun, isRunning, babelReady }) {
  const { projectName, settings, updateSetting, openSettings } = useIDEStore();
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8, padding:'0 12px',
      height:48, background:'#0a1628', borderBottom:'1px solid #1e3a5c', flexShrink:0,
    }}>
      <span style={{ fontSize:18 }}>⚡</span>
      <span style={{ color:'#00d4cc', fontWeight:700, fontSize:13, fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {projectName}
      </span>
      <button onClick={() => updateSetting('autoRefresh', !settings.autoRefresh)} style={{
        padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer',
        border:`1px solid ${settings.autoRefresh ? 'rgba(0,212,204,.4)' : '#1e3a5c'}`,
        background: settings.autoRefresh ? 'rgba(0,212,204,.1)' : 'transparent',
        color:      settings.autoRefresh ? '#00d4cc' : '#6a8fae',
      }}>⟳</button>
      <button onClick={openSettings} style={{ background:'transparent', border:'none', color:'#6a8fae', fontSize:18, cursor:'pointer', padding:'2px 4px' }}>⚙</button>
      <button onClick={onRun} disabled={!babelReady || isRunning} style={{
        padding:'6px 16px', borderRadius:8, border:'none', fontWeight:700, fontSize:13,
        background: babelReady ? '#00d4cc' : '#122033', color: babelReady ? '#070d19' : '#6a8fae',
        cursor:'pointer', opacity:(!babelReady||isRunning)?0.7:1,
        boxShadow: babelReady ? '0 0 12px rgba(0,212,204,.3)' : 'none',
      }}>
        {isRunning ? '…' : '▶ Run'}
      </button>
    </div>
  );
}

