/**
 * App.jsx  — Main IDE shell
 * ─────────────────────────────────────────────────────────────────────────────
 * Layout (left→right, top→bottom):
 *
 *  ┌─────────────────────────────────────────────────────┐
 *  │                   Toolbar (48 px)                   │
 *  ├──────────┬──────────────────────────┬───────────────┤
 *  │          │  TabBar (40 px)          │               │
 *  │ Sidebar  ├──────────────────────────┤   Preview     │
 *  │          │  Monaco Editor           │   (iframe)    │
 *  │          │  (flex-1)                │               │
 *  │          ├──────────────────────────┤               │
 *  │          │  Console (180 px)        │               │
 *  ├──────────┴──────────────────────────┴───────────────┤
 *  │                  StatusBar (24 px)                  │
 *  └─────────────────────────────────────────────────────┘
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

export default function App() {
  const {
    files,
    isSidebarOpen, sidebarWidth, setSidebarWidth,
    isConsoleOpen,
    isPreviewOpen,  previewPercent, setPreviewPercent,
    consoleHeight,  setConsoleHeight,
    autoRefresh,
    addLog, clearConsole,
  } = useIDEStore();

  const [previewHTML,    setPreviewHTML]    = useState('');
  const [previewKey,     setPreviewKey]     = useState(0);
  const [babelReady,     setBabelReady]     = useState(!!window.Babel);
  const [isRunning,      setIsRunning]      = useState(false);

  const autoRefreshTimer = useRef(null);

  // ── Wait for Babel CDN script ────────────────────────────────────────────
  useEffect(() => {
    if (window.Babel) { setBabelReady(true); return; }
    waitForBabel()
      .then(() => setBabelReady(true))
      .catch(err => console.error('[WebIDE]', err));
  }, []);

  // ── Core: generate & inject preview HTML ─────────────────────────────────
  const runPreview = useCallback(() => {
    setIsRunning(true);
    clearConsole();
    try {
      const html = generatePreviewHTML(files);
      setPreviewHTML(html);
      setPreviewKey(k => k + 1);
    } catch (err) {
      console.error('[WebIDE] Preview generation failed:', err);
    } finally {
      setIsRunning(false);
    }
  }, [files, clearConsole]);

  // ── Auto-refresh (debounced 700 ms after last file change) ───────────────
  useEffect(() => {
    if (!autoRefresh || !babelReady) return;
    clearTimeout(autoRefreshTimer.current);
    autoRefreshTimer.current = setTimeout(runPreview, 700);
    return () => clearTimeout(autoRefreshTimer.current);
  }, [files, autoRefresh, babelReady, runPreview]);

  // ── Initial run after Babel loads ────────────────────────────────────────
  useEffect(() => {
    if (babelReady) runPreview();
  }, [babelReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PostMessage: receive console output from iframe ──────────────────────
  useEffect(() => {
    function onMessage(e) {
      if (e.data?.type === 'console')       addLog(e.data);
      if (e.data?.type === 'preview-ready') { /* could set a "loaded" badge */ }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [addLog]);

  // ── Drag resize: sidebar width ────────────────────────────────────────────
  const sidebarDragRef = useRef(null);
  function startSidebarDrag(e) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    function onMove(ev) { setSidebarWidth(startW + ev.clientX - startX); }
    function onUp()  {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',  onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',  onUp);
  }

  // ── Drag resize: preview panel width (% of content area) ─────────────────
  const previewDragRef = useRef(null);
  function startPreviewDrag(e) {
    e.preventDefault();
    const startX = e.clientX;
    const startP = previewPercent;
    const totalW = previewDragRef.current?.parentElement?.clientWidth ?? 800;
    function onMove(ev) {
      const delta = -(ev.clientX - startX);
      setPreviewPercent(startP + (delta / totalW) * 100);
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',  onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',  onUp);
  }

  // ── Drag resize: console height ───────────────────────────────────────────
  function startConsoleDrag(e) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = consoleHeight;
    function onMove(ev) { setConsoleHeight(startH - (ev.clientY - startY)); }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',  onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',  onUp);
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-ide-bg text-ide-text select-none">

      {/* ── Top Toolbar ──────────────────────────────────────────────── */}
      <Toolbar onRun={runPreview} isRunning={isRunning} babelReady={babelReady} />

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>

        {/* Sidebar */}
        {isSidebarOpen && (
          <>
            <FileExplorer style={{ width: sidebarWidth, minWidth: sidebarWidth }} />
            {/* Drag handle */}
            <div
              className="resize-handle w-[3px]"
              onMouseDown={startSidebarDrag}
              title="Drag to resize"
            />
          </>
        )}

        {/* Editor column */}
        <div className="flex flex-col flex-1 overflow-hidden" style={{ minWidth: 0 }}>
          <TabBar />

          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }} ref={previewDragRef}>

            {/* Editor + Console (vertical stack) */}
            <div className="flex flex-col flex-1 overflow-hidden" style={{ minWidth: 0 }}>
              {/* Monaco Editor */}
              <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
                <CodeEditor />
              </div>

              {/* Console drag handle */}
              {isConsoleOpen && (
                <>
                  <div
                    className="resize-handle-row h-[3px] cursor-row-resize"
                    onMouseDown={startConsoleDrag}
                  />
                  <ConsolePanel style={{ height: consoleHeight }} />
                </>
              )}
            </div>

            {/* Preview panel */}
            {isPreviewOpen && (
              <>
                {/* Drag handle */}
                <div
                  className="resize-handle w-[3px]"
                  onMouseDown={startPreviewDrag}
                />
                <Preview
                  html={previewHTML}
                  previewKey={previewKey}
                  onRun={runPreview}
                  isRunning={isRunning}
                  babelReady={babelReady}
                  style={{ width: `${previewPercent}%`, flexShrink: 0 }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Status Bar ───────────────────────────────────────────────── */}
      <StatusBar babelReady={babelReady} isRunning={isRunning} />
    </div>
  );
}
