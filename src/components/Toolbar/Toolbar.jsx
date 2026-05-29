/**
 * Toolbar.jsx — Top toolbar with run, project name, layout toggles
 */
import { useState, useRef } from 'react';
import useIDEStore from '../../store/useIDEStore';

const Btn = ({ onClick, title, disabled, className = '', children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`ide-icon-btn px-2 h-7 text-xs gap-1.5 ${className}`}
  >
    {children}
  </button>
);

export default function Toolbar({ onRun, isRunning, babelReady }) {
  const {
    projectName, setProjectName,
    autoRefresh, toggleAutoRefresh,
    isSidebarOpen, toggleSidebar,
    isConsoleOpen, toggleConsole,
    isPreviewOpen, togglePreview,
    wordWrap, toggleWordWrap,
    fontSize, setFontSize,
    exportProject, loadProject, resetProject,
  } = useIDEStore();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft,   setNameDraft]   = useState(projectName);
  const fileInputRef = useRef(null);

  function commitName() {
    const trimmed = nameDraft.trim();
    if (trimmed) setProjectName(trimmed);
    else setNameDraft(projectName);
    setEditingName(false);
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.files) loadProject(data);
        else alert('Invalid .webide.json file');
      } catch {
        alert('Could not parse file. Make sure it is a valid .webide.json export.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleReset() {
    if (confirm('Reset to the default starter project? All unsaved changes will be lost.')) {
      resetProject();
    }
  }

  return (
    <div
      className="flex items-center h-12 px-3 gap-2 flex-shrink-0 border-b"
      style={{ background: '#0a1628', borderColor: 'var(--ide-border)' }}
    >
      {/* ── Brand ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mr-2 flex-shrink-0">
        <span className="text-xl leading-none select-none">⚡</span>
        <span
          className="font-bold text-sm tracking-tight"
          style={{ color: 'var(--ide-accent)', fontFamily: 'JetBrains Mono, monospace' }}
        >
          WebIDE
        </span>
      </div>

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div className="w-px h-6 flex-shrink-0" style={{ background: 'var(--ide-border)' }} />

      {/* ── Run Button ────────────────────────────────────────────── */}
      <button
        onClick={onRun}
        disabled={!babelReady || isRunning}
        title={babelReady ? 'Run Preview (Ctrl+Enter)' : 'Loading Babel…'}
        className="flex items-center gap-2 px-4 h-7 rounded-md text-xs font-semibold
                   transition-all duration-150 flex-shrink-0 disabled:opacity-50"
        style={{
          background:    babelReady ? 'var(--ide-accent)' : 'var(--ide-surface)',
          color:         babelReady ? '#070d19' : 'var(--ide-textMuted)',
          boxShadow:     babelReady ? '0 0 12px rgba(0,212,204,0.25)' : 'none',
        }}
      >
        {isRunning
          ? <><SpinIcon /> Running…</>
          : babelReady
            ? <><TriangleIcon /> Run</>
            : <><SpinIcon /> Loading…</>
        }
      </button>

      {/* ── Auto-refresh toggle ────────────────────────────────────── */}
      <button
        onClick={toggleAutoRefresh}
        title={`Auto-refresh: ${autoRefresh ? 'ON' : 'OFF'}`}
        className="flex items-center gap-1.5 px-2.5 h-7 rounded text-[11px] font-medium
                   transition-all flex-shrink-0"
        style={{
          background: autoRefresh ? 'rgba(0,212,204,0.1)' : 'transparent',
          border:     `1px solid ${autoRefresh ? 'rgba(0,212,204,0.3)' : 'var(--ide-border)'}`,
          color:      autoRefresh ? 'var(--ide-accent)' : 'var(--ide-textMuted)',
        }}
      >
        <AutoIcon />
        Auto
      </button>

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div className="w-px h-6 flex-shrink-0" style={{ background: 'var(--ide-border)' }} />

      {/* ── Project Name ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex items-center justify-center">
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setNameDraft(projectName); setEditingName(false); } }}
            className="text-center text-sm font-medium bg-transparent outline-none
                       border-b w-48 pb-0.5"
            style={{ color: 'var(--ide-text)', borderColor: 'var(--ide-accent)' }}
          />
        ) : (
          <span
            className="text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity truncate px-2"
            style={{ color: 'var(--ide-textMuted)' }}
            onDoubleClick={() => { setNameDraft(projectName); setEditingName(true); }}
            title="Double-click to rename project"
          >
            {projectName}
          </span>
        )}
      </div>

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div className="w-px h-6 flex-shrink-0" style={{ background: 'var(--ide-border)' }} />

      {/* ── Editor Settings ───────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {/* Font size */}
        <div className="flex items-center gap-0.5 mr-1">
          <Btn onClick={() => setFontSize(fontSize - 1)} title="Decrease font size">A-</Btn>
          <span className="text-[11px] w-6 text-center" style={{ color: 'var(--ide-textMuted)' }}>{fontSize}</span>
          <Btn onClick={() => setFontSize(fontSize + 1)} title="Increase font size">A+</Btn>
        </div>

        <Btn onClick={toggleWordWrap}  title={`Word Wrap: ${wordWrap ? 'ON' : 'OFF'}`}
             className={wordWrap ? 'text-ide-accent' : ''}>
          <WrapIcon />
        </Btn>
      </div>

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div className="w-px h-6 flex-shrink-0" style={{ background: 'var(--ide-border)' }} />

      {/* ── File Operations ───────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <Btn onClick={exportProject} title="Export project as JSON">
          <ExportIcon /> <span className="text-[11px]">Export</span>
        </Btn>
        <Btn onClick={() => fileInputRef.current?.click()} title="Import project JSON">
          <ImportIcon /> <span className="text-[11px]">Import</span>
        </Btn>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        <Btn onClick={handleReset} title="Reset to starter template">
          <ResetIcon />
        </Btn>
      </div>

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div className="w-px h-6 flex-shrink-0" style={{ background: 'var(--ide-border)' }} />

      {/* ── Layout Toggles ────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <LayoutBtn active={isSidebarOpen}  onClick={toggleSidebar}  title="Toggle Sidebar"  icon={<SidebarIcon />}  />
        <LayoutBtn active={isConsoleOpen}  onClick={toggleConsole}  title="Toggle Console"  icon={<ConsoleIcon />}  />
        <LayoutBtn active={isPreviewOpen}  onClick={togglePreview}  title="Toggle Preview"  icon={<PreviewIcon />}  />
      </div>
    </div>
  );
}

function LayoutBtn({ active, onClick, title, icon }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="ide-icon-btn w-7 h-7 rounded"
      style={{ color: active ? 'var(--ide-accent)' : 'var(--ide-textMuted)' }}
    >
      {icon}
    </button>
  );
}

// ── Icons (inline SVG) ────────────────────────────────────────────────────────
const TriangleIcon = () => (
  <svg width="10" height="11" viewBox="0 0 10 11" fill="currentColor">
    <path d="M1 1.5l8 4-8 4V1.5z" />
  </svg>
);
const SpinIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
       className="animate-spin">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4
             M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);
const AutoIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
  </svg>
);
const WrapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M3 12h12a3 3 0 110 6h-3M3 18h3"/>
  </svg>
);
const ExportIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
  </svg>
);
const ImportIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
  </svg>
);
const ResetIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);
const SidebarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
  </svg>
);
const ConsoleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M7 8l4 4-4 4M13 16h4"/>
  </svg>
);
const PreviewIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 17v4"/>
  </svg>
);
