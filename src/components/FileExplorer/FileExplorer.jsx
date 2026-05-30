/**
 * FileExplorer.jsx v3 — Enterprise Project Dashboard & File Tree Container
 * ✅ مدمج بالكامل: لوحة تحكم متكاملة في الأعلى لإدارة وتبديل وحذف المشاريع محلياً.
 * ✅ عزل برمي كامل: تحديث شجرة الملفات إجبارياً فور الانتقال من مشروع لآخر.
 * ✅ معالجة حماية الـ Sandbox للمتصفحات الخارجية والزبائن لمنع الشاشة البيضاء.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import useIDEStore from '../../store/useIDEStore';
import { buildFileTree, fileIcon, fileLang, LANG_COLOR, isValidFilename, pathDirname } from '../../utils/fileSystem';
import { importZIP, readUploadedFiles } from '../../utils/zipHandler';

const S = {
  root:    { display:'flex', flexDirection:'column', height:'100%', background:'#0a1420', borderRight:'1px solid #1e3a5c', overflow:'hidden' },
  dashboard:{ padding: '10px', background: '#0d1f35', borderBottom: '2px solid #1e3a5c', spaceY: 8 },
  select:   { width: '100%', bg: '#122033', color: '#00d4cc', border: '1px solid #1e3a5c', borderRadius: 6, padding: '6px', fontSize: 12, outline: 'none', fontWeight: 'bold' },
  header:  { display:'flex', alignItems:'center', gap:6, padding:'0 10px', height:38, flexShrink:0, borderBottom:'1px solid #1e3a5c', background:'#091625' },
  hTitle:  { color:'#6a8fae', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  iconBtn: { background:'transparent', border:'none', color:'#6a8fae', cursor:'pointer', padding:'3px 5px', borderRadius:5, fontSize:14, lineHeight:1, transition:'color .15s' },
  tree:    { flex:1, overflowY:'auto', padding:'4px 0' },
  footer:  { padding:'6px 10px', borderTop:'1px solid #1e3a5c', fontSize:10, color:'#3d6080', flexShrink:0, display:'flex', justifyContent:'space-between' },
};

function LangDot({ filename }) {
  const lang  = fileLang(filename);
  const color = LANG_COLOR[lang] ?? '#3d6080';
  return <span style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }} title={lang} />;
}

function TreeNode({ node, depth = 0, onContextMenu }) {
  const { openFile, activeFile, toggleFolder, expandedFolders } = useIDEStore();
  const expanded = expandedFolders[node.path] ?? true;
  const isActive = !node.isFolder && activeFile === node.path;
  const pad = 8 + depth * 14;

  if (node.isFolder) {
    return (
      <>
        <div
          onClick={() => toggleFolder(node.path)}
          onContextMenu={e => onContextMenu(e, node)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:`5px 8px 5px ${pad}px`, cursor:'pointer', color: expanded ? '#dde8f5' : '#6a8fae', userSelect:'none' }}
          className="hover-row"
        >
          <span style={{ fontSize:11, color:'#6a8fae', width:10, flexShrink:0 }}>{expanded ? '▾' : '▸'}</span>
          <span style={{ fontSize:14 }}>📁</span>
          <span style={{ fontSize:12, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{node.name}</span>
        </div>
        {expanded && node.children?.map(child => (
          <TreeNode key={child.path} node={child} depth={depth + 1} onContextMenu={onContextMenu} />
        ))}
      </>
    );
  }

  return (
    <div
      onClick={() => openFile(node.path)}
      onContextMenu={e => onContextMenu(e, node)}
      style={{ display:'flex', alignItems:'center', gap:6, padding:`5px 8px 5px ${pad}px`, cursor:'pointer', background: isActive ? 'rgba(0,212,204,0.1)' : 'transparent', borderRight: isActive ? '2px solid #00d4cc' : '2px solid transparent', color: isActive ? '#00d4cc' : '#8bacc8', userSelect:'none' }}
      className="hover-row"
    >
      <span style={{ fontSize:14, flexShrink:0 }}>{fileIcon(node.name)}</span>
      <span style={{ fontSize:12, flex:1, fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{node.name}</span>
      <LangDot filename={node.name} />
    </div>
  );
}

function ContextMenu({ menu, onClose }) {
  const { openFile, deleteFile, duplicateFile, renameFile } = useIDEStore();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(menu.node.name);
  const inputRef = useRef(null);

  useEffect(() => { if (renaming) inputRef.current?.focus(); }, [renaming]);

  function doRename() {
    if (!draft.trim() || draft === menu.node.name) { onClose(); return; }
    const dir     = pathDirname(menu.node.path);
    const newPath = dir ? `${dir}/${draft.trim()}` : draft.trim();
    if (typeof renameFile === 'function') renameFile(menu.node.path, newPath);
    onClose();
  }

  if (renaming) {
    return (
      <div style={{ position:'fixed', top:menu.y, left:menu.x, zIndex:9999, background:'#0d1929', border:'1px solid #1e3a5c', borderRadius:8, padding:8, boxShadow:'0 8px 24px #00000060', minWidth:200 }}>
        <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doRename(); if (e.key === 'Escape') onClose(); }} onBlur={doRename} style={{ width:'100%', background:'#122033', border:'1px solid #00d4cc', borderRadius:4, padding:'4px 8px', color:'#dde8f5', fontSize:12, fontFamily:'monospace', outline:'none' }} />
      </div>
    );
  }

  const items = [
    !menu.node.isFolder && { icon:'📂', label:'Open', action: () => { openFile(menu.node.path); onClose(); } },
    !menu.node.isFolder && { icon:'📋', label:'Duplicate', action: () => { if (typeof duplicateFile === 'function') duplicateFile(menu.node.path); onClose(); } },
    { icon:'✏️', label:'Rename', action: () => setRenaming(true) },
    { icon:'🗑️', label:'Delete', danger: true, action: () => { if (confirm(`هل تريد حذف "${menu.node.name}"؟`)) { deleteFile(menu.node.path); onClose(); } } },
  ].filter(Boolean);

  return (
    <div style={{ position:'fixed', top:menu.y, left:menu.x, zIndex:9999, background:'#0d1929', border:'1px solid #1e3a5c', borderRadius:8, padding:4, boxShadow:'0 8px 24px #00000060', minWidth:160 }} onMouseLeave={onClose}>
      {items.map(item => (
        <button key={item.label} onClick={item.action} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 12px', background:'transparent', border:'none', color: item.danger ? '#f87171' : '#dde8f5', fontSize:12, cursor:'pointer', borderRadius:4, textAlign:'right', fontFamily:'Cairo, sans-serif' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <span>{item.icon}</span> {item.label}
        </button>
      ))}
    </div>
  );
}

export default function FileExplorer({ style }) {
  const { 
    files, projectName, projects, currentProjectId,
    createFile, createFolder, loadProject, collapseAll, switchProject 
  } = useIDEStore();

  const [creating,     setCreating]     = useState(null); 
  const [newName,      setNewName]      = useState('');
  const [contextMenu,  setContextMenu]  = useState(null);
  const [isDragOver,   setIsDragOver]   = useState(false);
  const fileInputRef   = useRef(null);
  const createInputRef = useRef(null);

  useEffect(() => { if (creating) createInputRef.current?.focus(); }, [creating]);

  const tree = buildFileTree(files || {});
  const fileCount = Object.keys(files || {}).length;

  function onContextMenu(e, node) {
    e.preventDefault(); e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth  - 180);
    const y = Math.min(e.clientY, window.innerHeight - 120);
    setContextMenu({ x, y, node });
  }

  useEffect(() => {
    if (!contextMenu) return;
    const h = () => setContextMenu(null);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [contextMenu]);

  function submitCreate() {
    const name = newName.trim();
    if (name && isValidFilename(name)) {
      if (creating === 'file')   createFile(name);
      if (creating === 'folder') createFolder(name);
    }
    setCreating(null); setNewName('');
  }

  async function handleFileUpload(e) {
    const list = e.target.files;
    if (!list?.length) return;
    if (list.length === 1 && list[0].name.endsWith('.zip')) {
      const data = await importZIP(list[0]);
      loadProject(data);
    } else {
      const newFiles = await readUploadedFiles(list);
      if (useIDEStore.getState().addFiles) useIDEStore.getState().addFiles(newFiles);
    }
    e.target.value = '';
  }

  const onDragOver  = useCallback(e => { e.preventDefault(); setIsDragOver(true);  }, []);
  const onDragLeave = useCallback(e => { e.preventDefault(); setIsDragOver(false); }, []);
  const onDrop      = useCallback(async e => {
    e.preventDefault(); setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length === 1 && files[0].name.endsWith('.zip')) {
      const data = await importZIP(files[0]);
      loadProject(data);
      return;
    }
    if (files.length > 0) {
      const newFiles = await readUploadedFiles(files);
      if (useIDEStore.getState().addFiles) useIDEStore.getState().addFiles(newFiles);
    }
  }, [loadProject]);

  return (
    <div style={{ ...S.root, ...style, outline: isDragOver ? '2px dashed #00d4cc' : 'none' }} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <style>{`.hover-row:hover{background:rgba(255,255,255,0.05)!important;}`}</style>

      {/* 🏛️ لوحة تصفح ومبادلة المشاريع الحقيقية (Dashboard Panel) */}
      <div style={{ padding: '10px', background: '#0a1626', borderBottom: '1px solid #1e3a5c' }}>
        <label style={{ fontSize: 10, color: '#6a8fae', fontWeight: 'bold', display: 'block', marginBottom: 4 }}>
          📂 المشاريع النشطة بالمنصة:
        </label>
        <select 
          value={currentProjectId || ''} 
          onChange={(e) => { if (e.target.value) switchProject(e.target.value); }}
          style={{ width: '100%', background: '#122033', color: '#00d4cc', border: '1px solid #1e3a5c', borderRadius: 6, padding: '6px', fontSize: 12, outline: 'none', fontWeight: 'bold' }}
        >
          <option value="" disabled> اختر مشروعاً للتعديل... </option>
          {Object.values(projects || {}).map((proj) => (
            <option key={proj.id} value={proj.id}>💼 {proj.name}</option>
          ))}
        </select>
      </div>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={S.header}>
        <span style={S.hTitle} title={projectName}>{projectName}</span>
        <button style={S.iconBtn} title="New File" onClick={() => { setCreating('file'); setNewName(''); }}>📄</button>
        <button style={S.iconBtn} title="New Folder" onClick={() => { setCreating('folder'); setNewName(''); }}>📁</button>
        <button style={S.iconBtn} title="Upload Files" onClick={() => fileInputRef.current?.click()}>⬆</button>
        <button style={S.iconBtn} title="Collapse All" onClick={collapseAll}>⊟</button>
      </div>

      {/* ── File Tree ─────────────────────────────────────────── */}
      <div style={S.tree}>
        {creating && (
          <div style={{ padding:'5px 8px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 8px', background:'#122033', borderRadius:6, border:'1px solid #1e3a5c' }}>
              <span style={{ fontSize:14 }}>{creating === 'file' ? '📄' : '📁'}</span>
              <input ref={createInputRef} value={newName} placeholder={creating === 'file' ? 'filename.jsx' : 'folder-name'} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitCreate(); if (e.key === 'Escape') { setCreating(null); setNewName(''); } }} onBlur={() => { if (!newName.trim()) setCreating(null); else submitCreate(); }} style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'#dde8f5', fontSize:12, fontFamily:'monospace' }} />
            </div>
          </div>
        )}

        {isDragOver && <div style={{ textAlign:'center', padding:20, color:'#00d4cc', fontSize:12, pointerEvents:'none' }}>📦 Drop files here</div>}

        {!isDragOver && tree.length === 0 && (
          <div style={{ padding:20, textAlign:'center', color:'#3d6080', fontSize:12 }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📂</div>
            لا توجد ملفات بالمشروع<br/><span style={{ opacity:.6 }}>اضغط على الأزرار لإنشاء ملفات</span>
          </div>
        )}

        {tree.map(node => (
          <TreeNode key={node.path} node={node} depth={0} onContextMenu={onContextMenu} />
        ))}
      </div>

      {/* ── Footer ────────────────────────────────────────────── */}
      <div style={S.footer}>
        <span>{fileCount} ملفات</span>
        <span style={{ color:'#00d4cc', cursor:'pointer', fontSize:10 }} onClick={() => fileInputRef.current?.click()}>⬆ رفع ملفات</span>
      </div>

      <input ref={fileInputRef} type="file" multiple accept="*" style={{ display:'none' }} onChange={handleFileUpload} />
      {contextMenu && <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />}
    </div>
  );
}
