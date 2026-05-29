/**
 * App.jsx — الـ shell الرئيسي للـ IDE
 * ✅ يدعم الموبايل بتنقل سفلي (Files / Code / Preview / Console)
 * ✅ إصلاح الكراش: لا يُحدَّث الـ preview عند وجود أخطاء Babel
 * ✅ debounce أطول على الموبايل (2000ms بدل 700ms)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import useIDEStore from './store/useIDEStore';
import Toolbar       from './components/Toolbar/Toolbar';
import FileExplorer  from './components/FileExplorer/FileExplorer';
import TabBar        from './components/TabBar/TabBar';
import CodeEditor    from './components/Editor/CodeEditor';
import Preview       from './components/Preview/Preview';
import ConsolePanel  from './components/ConsolePanel/ConsolePanel';
import StatusBar     from './components/StatusBar/StatusBar';
import { generatePreviewHTML } from './utils/htmlGenerator';
import { waitForBabel } from './utils/transpiler';

// ─── كشف الموبايل ────────────────────────────────────────────────────────────
function useIsMobile() {
  const [mob, setMob] = useState(window.innerWidth < 900);
  useEffect(() => {
    const h = () => setMob(window.innerWidth < 900);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mob;
}

// ─── أيقونات التنقل السفلي ────────────────────────────────────────────────────
const NAV_TABS = [
  { id: 'files',   label: 'ملفات',   icon: '📁' },
  { id: 'code',    label: 'كود',     icon: '✏️' },
  { id: 'preview', label: 'معاينة',  icon: '▶' },
  { id: 'console', label: 'Console', icon: '⬛' },
];

export default function App() {
  const {
    files,
    isSidebarOpen, sidebarWidth, setSidebarWidth,
    isConsoleOpen,
    isPreviewOpen, previewPercent, setPreviewPercent,
    consoleHeight, setConsoleHeight,
    autoRefresh,
    addLog, clearConsole,
  } = useIDEStore();

  const isMobile = useIsMobile();
  const [mobileTab,  setMobileTab]  = useState('code');
  const [previewHTML, setPreviewHTML] = useState('');
  const [previewKey,  setPreviewKey]  = useState(0);
  const [babelReady,  setBabelReady]  = useState(!!window.Babel);
  const [isRunning,   setIsRunning]   = useState(false);

  const timerRef   = useRef(null);
  const filesRef   = useRef(files);
  useEffect(() => { filesRef.current = files; }, [files]);

  // ── انتظار Babel ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (window.Babel) { setBabelReady(true); return; }
    waitForBabel().then(() => setBabelReady(true)).catch(console.error);
  }, []);

  // ── تشغيل المعاينة ────────────────────────────────────────────────────────
  const runPreview = useCallback((force = false) => {
    try {
      setIsRunning(true);
      const { html, hasErrors } = generatePreviewHTML(filesRef.current);

      // ✅ الإصلاح الجوهري: لا تُحدّث الـ iframe إذا كان الكود مكسوراً
      // (إلا إذا ضغط المستخدم Run يدوياً)
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

  // ── Auto-refresh مع debounce أطول على الموبايل ───────────────────────────
  useEffect(() => {
    if (!autoRefresh || !babelReady) return;
    clearTimeout(timerRef.current);
    const delay = isMobile ? 2500 : 700;
    timerRef.current = setTimeout(() => runPreview(false), delay);
    return () => clearTimeout(timerRef.current);
  }, [files, autoRefresh, babelReady, isMobile]); // eslint-disable-line

  // ── أول تشغيل بعد تحميل Babel ────────────────────────────────────────────
  useEffect(() => {
    if (babelReady) runPreview(true);
  }, [babelReady]); // eslint-disable-line

  // ── استقبال رسائل الـ console من الـ iframe ───────────────────────────────
  useEffect(() => {
    const h = (e) => { if (e.data?.type === 'console') addLog(e.data); };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, [addLog]);

  // ── Drag resize (desktop فقط) ─────────────────────────────────────────────
  const previewDragRef = useRef(null);

  function makeDragger(onMove) {
    return (e) => {
      e.preventDefault();
      const up = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', up); };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', up);
    };
  }

  const startSidebarDrag = makeDragger((e) => setSidebarWidth(sidebarWidth + e.movementX));
  const startPreviewDrag = makeDragger((e) => {
    const w = previewDragRef.current?.parentElement?.clientWidth ?? 1000;
    setPreviewPercent(previewPercent - (e.movementX / w) * 100);
  });
  const startConsoleDrag = makeDragger((e) => setConsoleHeight(consoleHeight - e.movementY));

  // ══════════════════════════════════════════════════════════════════════════
  // الـ render للموبايل
  // ══════════════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100dvh',
                    background:'var(--ide-bg)', color:'var(--ide-text)', overflow:'hidden' }}>

        {/* ── Header مضغوط للموبايل ─────────────────────────────── */}
        <MobileHeader onRun={() => runPreview(true)} isRunning={isRunning} babelReady={babelReady} />

        {/* ── منطقة المحتوى ─────────────────────────────────────── */}
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {mobileTab === 'files'   && <FileExplorer style={{ flex:1, width:'100%', border:'none' }} />}
          {mobileTab === 'code'    && <CodeEditor />}
          {mobileTab === 'preview' && (
            <Preview
              html={previewHTML} previewKey={previewKey}
              onRun={() => runPreview(true)}
              isRunning={isRunning} babelReady={babelReady}
              style={{ flex:1, border:'none' }}
            />
          )}
          {mobileTab === 'console' && <ConsolePanel style={{ flex:1, height:'100%' }} />}
        </div>

        {/* ── شريط التنقل السفلي ────────────────────────────────── */}
        <div style={{
          display:        'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          background:     '#0a1628',
          borderTop:      '1px solid var(--ide-border)',
          flexShrink:     0,
        }}>
          {NAV_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              style={{
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            3,
                padding:        '8px 4px',
                border:         'none',
                background:     mobileTab === tab.id ? 'rgba(0,212,204,0.1)' : 'transparent',
                borderTop:      mobileTab === tab.id ? '2px solid var(--ide-accent)' : '2px solid transparent',
                color:          mobileTab === tab.id ? 'var(--ide-accent)' : 'var(--ide-textMuted)',
                cursor:         'pointer',
                fontSize:       10,
                fontWeight:     600,
                letterSpacing:  '0.05em',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // الـ render للـ Desktop (بدون تغيير)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-ide-bg text-ide-text select-none">
      <Toolbar onRun={() => runPreview(true)} isRunning={isRunning} babelReady={babelReady} />

      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {isSidebarOpen && (
          <>
            <FileExplorer style={{ width: sidebarWidth, minWidth: sidebarWidth }} />
            <div className="resize-handle w-[3px]" onMouseDown={startSidebarDrag} />
          </>
        )}

        <div className="flex flex-col flex-1 overflow-hidden" style={{ minWidth: 0 }}>
          <TabBar />
          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }} ref={previewDragRef}>

            <div className="flex flex-col flex-1 overflow-hidden" style={{ minWidth: 0 }}>
              <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
                <CodeEditor />
              </div>
              {isConsoleOpen && (
                <>
                  <div className="resize-handle-row h-[3px]" onMouseDown={startConsoleDrag} />
                  <ConsolePanel style={{ height: consoleHeight }} />
                </>
              )}
            </div>

            {isPreviewOpen && (
              <>
                <div className="resize-handle w-[3px]" onMouseDown={startPreviewDrag} />
                <Preview
                  html={previewHTML} previewKey={previewKey}
                  onRun={() => runPreview(true)}
                  isRunning={isRunning} babelReady={babelReady}
                  style={{ width: `${previewPercent}%`, flexShrink: 0 }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <StatusBar babelReady={babelReady} isRunning={isRunning} />
    </div>
  );
}

// ── Header مضغوط خاص بالموبايل ───────────────────────────────────────────────
function MobileHeader({ onRun, isRunning, babelReady }) {
  const { projectName, autoRefresh, toggleAutoRefresh } = useIDEStore();
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      gap:            8,
      padding:        '0 12px',
      height:         48,
      background:     '#0a1628',
      borderBottom:   '1px solid var(--ide-border)',
      flexShrink:     0,
    }}>
      <span style={{ fontSize: 18 }}>⚡</span>
      <span style={{ color: 'var(--ide-accent)', fontWeight: 700, fontSize: 14,
                     fontFamily: 'monospace', flex: 1, overflow: 'hidden',
                     textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {projectName}
      </span>

      {/* زر Auto */}
      <button onClick={toggleAutoRefresh} style={{
        padding:      '4px 10px',
        borderRadius: 6,
        border:       `1px solid ${autoRefresh ? 'rgba(0,212,204,0.4)' : 'var(--ide-border)'}`,
        background:   autoRefresh ? 'rgba(0,212,204,0.1)' : 'transparent',
        color:        autoRefresh ? 'var(--ide-accent)' : 'var(--ide-textMuted)',
        fontSize:     11, fontWeight: 600, cursor: 'pointer',
      }}>
        {autoRefresh ? '⟳ Auto' : '⟳ Off'}
      </button>

      {/* زر Run */}
      <button onClick={onRun} disabled={!babelReady || isRunning} style={{
        padding:      '6px 16px',
        borderRadius: 8,
        border:       'none',
        background:   babelReady ? 'var(--ide-accent)' : 'var(--ide-surface)',
        color:        babelReady ? '#070d19' : 'var(--ide-textMuted)',
        fontSize:     13, fontWeight: 700, cursor: 'pointer',
        boxShadow:    babelReady ? '0 0 12px rgba(0,212,204,0.3)' : 'none',
        opacity:      (!babelReady || isRunning) ? 0.7 : 1,
        minWidth:     64,
      }}>
        {isRunning ? '…' : '▶ Run'}
      </button>
    </div>
  );
}

