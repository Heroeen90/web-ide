/**
 * FileExplorer.jsx — Left sidebar with virtual file system tree
 */
import { useState, useRef, useEffect } from 'react';
import useIDEStore from '../../store/useIDEStore';
import { FILE_ICONS, FILE_LANGUAGE_MAP } from '../../utils/defaultFiles';

const LANG_COLORS = {
  javascript: '#f7df1e',
  typescript: '#3178c6',
  css:        '#38bdf8',
  html:       '#e06c33',
  json:       '#9ca3af',
  markdown:   '#7dd3fc',
};

function getExt(name) { return name.split('.').pop().toLowerCase(); }

function FileIcon({ filename }) {
  const ext  = getExt(filename);
  const icon = FILE_ICONS[ext] ?? '📄';
  return <span className="text-base leading-none select-none">{icon}</span>;
}

function LangDot({ filename }) {
  const ext  = getExt(filename);
  const lang = FILE_LANGUAGE_MAP[ext];
  const color = lang ? LANG_COLORS[lang] : '#6a8fae';
  return (
    <span
      className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: color }}
      title={lang ?? 'text'}
    />
  );
}

export default function FileExplorer({ style }) {
  const {
    files, activeFile,
    openFile, createFile, deleteFile, renameFile,
    projectName,
  } = useIDEStore();

  const [creating,   setCreating]   = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renamingFile, setRenamingFile] = useState(null);
  const [renameDraft,  setRenameDraft]  = useState('');
  const [contextMenu,  setContextMenu]  = useState(null); // { x, y, file }
  const newFileInputRef    = useRef(null);
  const renameInputRef     = useRef(null);
  const contextMenuRef     = useRef(null);

  // Focus input when creating
  useEffect(() => {
    if (creating) newFileInputRef.current?.focus();
  }, [creating]);

  // Focus rename input
  useEffect(() => {
    if (renamingFile) renameInputRef.current?.focus();
  }, [renamingFile]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    function handler(e) {
      if (!contextMenuRef.current?.contains(e.target)) setContextMenu(null);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  function submitCreate() {
    const name = newFileName.trim();
    if (name) createFile(name);
    setCreating(false);
    setNewFileName('');
  }

  function submitRename() {
    const name = renameDraft.trim();
    if (name && name !== renamingFile) renameFile(renamingFile, name);
    setRenamingFile(null);
    setRenameDraft('');
  }

  function handleContextMenu(e, file) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  }

  function handleDelete(file) {
    if (confirm(`Delete "${file}"?`)) deleteFile(file);
    setContextMenu(null);
  }

  function startRename(file) {
    setRenamingFile(file);
    setRenameDraft(file);
    setContextMenu(null);
  }

  const sortedFiles = Object.keys(files).sort((a, b) => {
    // Directories first (not applicable here), then alphabetical
    const extA = getExt(a), extB = getExt(b);
    const ORDER = ['html', 'json', 'jsx', 'tsx', 'js', 'ts', 'css', 'md'];
    const ia = ORDER.indexOf(extA), ib = ORDER.indexOf(extB);
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b);
  });

  return (
    <div
      className="flex flex-col border-r overflow-hidden flex-shrink-0"
      style={{ background: 'var(--ide-surface)', borderColor: 'var(--ide-border)', ...style }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 h-9 flex-shrink-0 border-b"
        style={{ borderColor: 'var(--ide-border)' }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-widest truncate"
          style={{ color: 'var(--ide-textMuted)' }}
        >
          {projectName}
        </span>
        <button
          onClick={() => setCreating(true)}
          title="New File"
          className="ide-icon-btn w-6 h-6 rounded text-lg leading-none flex-shrink-0"
          style={{ color: 'var(--ide-accent)' }}
        >
          +
        </button>
      </div>

      {/* ── Section Label ─────────────────────────────────────────── */}
      <div
        className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest flex-shrink-0"
        style={{ color: 'var(--ide-textDim)' }}
      >
        FILES
      </div>

      {/* ── File List ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-2">
        {sortedFiles.map(filename => (
          <div key={filename}>
            {renamingFile === filename ? (
              // Inline rename input
              <div className="px-3 py-1">
                <input
                  ref={renameInputRef}
                  value={renameDraft}
                  onChange={e => setRenameDraft(e.target.value)}
                  onBlur={submitRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter')  submitRename();
                    if (e.key === 'Escape') { setRenamingFile(null); setRenameDraft(''); }
                  }}
                  className="w-full px-2 py-0.5 rounded text-xs outline-none font-mono"
                  style={{
                    background: 'var(--ide-elevated)',
                    border:     '1px solid var(--ide-accent)',
                    color:      'var(--ide-text)',
                  }}
                />
              </div>
            ) : (
              <div
                className={`file-item ${activeFile === filename ? 'active' : ''}`}
                onClick={() => openFile(filename)}
                onContextMenu={e => handleContextMenu(e, filename)}
              >
                <FileIcon filename={filename} />
                <span className="flex-1 truncate font-mono text-[12px]">{filename}</span>
                <LangDot filename={filename} />
              </div>
            )}
          </div>
        ))}

        {/* ── New file input ────────────────────────────────────── */}
        {creating && (
          <div className="px-3 py-1">
            <input
              ref={newFileInputRef}
              placeholder="filename.jsx"
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              onBlur={() => { if (!newFileName.trim()) setCreating(false); else submitCreate(); }}
              onKeyDown={e => {
                if (e.key === 'Enter')  submitCreate();
                if (e.key === 'Escape') { setCreating(false); setNewFileName(''); }
              }}
              className="w-full px-2 py-0.5 rounded text-xs outline-none font-mono"
              style={{
                background: 'var(--ide-elevated)',
                border:     '1px solid var(--ide-accent)',
                color:      'var(--ide-text)',
              }}
            />
          </div>
        )}
      </div>

      {/* ── Context Menu ──────────────────────────────────────────── */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 rounded-lg py-1 shadow-2xl overflow-hidden"
          style={{
            top:        contextMenu.y,
            left:       contextMenu.x,
            background: '#0d1929',
            border:     '1px solid var(--ide-border)',
            minWidth:   140,
          }}
        >
          <CtxItem
            icon="✏️"
            label="Rename"
            onClick={() => startRename(contextMenu.file)}
          />
          <CtxItem
            icon="🗑️"
            label="Delete"
            onClick={() => handleDelete(contextMenu.file)}
            danger
          />
        </div>
      )}

      {/* ── Footer: file count ────────────────────────────────────── */}
      <div
        className="px-3 py-2 text-[10px] border-t flex-shrink-0"
        style={{ borderColor: 'var(--ide-border)', color: 'var(--ide-textDim)' }}
      >
        {Object.keys(files).length} file{Object.keys(files).length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

function CtxItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors"
      style={{ color: danger ? 'var(--ide-error)' : 'var(--ide-text)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
