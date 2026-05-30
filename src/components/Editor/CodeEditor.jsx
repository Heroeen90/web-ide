/**
 * CodeEditor.jsx v2
 * Desktop → Monaco Editor (lazy loaded) with custom theme
 * Mobile  → Enhanced textarea with paste/clear/copy + line numbers
 */
import { useRef, useCallback, useEffect, useState } from 'react';
import useIDEStore from '../../store/useIDEStore';
import { fileLang, fileIcon } from '../../utils/fileSystem';

const isTouchDevice = () =>
  window.innerWidth < 900 || navigator.maxTouchPoints > 0;

// ── Monaco theme ──────────────────────────────────────────────────────────────
const MONACO_THEME = {
  base:'vs-dark', inherit:true,
  rules:[
    {token:'comment',foreground:'3d6080',fontStyle:'italic'},
    {token:'keyword',foreground:'00d4cc',fontStyle:'bold'},
    {token:'string', foreground:'34d399'},
    {token:'number', foreground:'fbbf24'},
    {token:'type',   foreground:'60a5fa'},
    {token:'function',foreground:'a78bfa'},
    {token:'tag',    foreground:'00d4cc'},
    {token:'attribute.name',foreground:'60a5fa'},
    {token:'attribute.value',foreground:'34d399'},
    {token:'delimiter',foreground:'6a8fae'},
  ],
  colors:{
    'editor.background':              '#070d19',
    'editor.foreground':              '#dde8f5',
    'editor.lineHighlightBackground': '#0d192950',
    'editorLineNumber.foreground':    '#2a4d78',
    'editorLineNumber.activeForeground':'#6a8fae',
    'editor.selectionBackground':     '#1e3a5c',
    'editorCursor.foreground':        '#00d4cc',
    'editorWidget.background':        '#0d1929',
    'editorSuggestWidget.background': '#0d1929',
    'editorSuggestWidget.border':     '#1e3a5c',
    'editorSuggestWidget.selectedBackground':'#122033',
    'scrollbarSlider.background':     '#1e3a5c80',
    'scrollbarSlider.hoverBackground':'#2a4d7880',
    'input.background':               '#0d1929',
    'editor.findMatchBackground':     '#00d4cc30',
    'editor.findMatchHighlightBackground':'#00d4cc15',
    'editorBracketMatch.background':  '#1e3a5c80',
    'editorBracketMatch.border':      '#00d4cc60',
  },
};

// ════════════════════════════════════════════════════════════════════════════
// Mobile textarea editor
// ════════════════════════════════════════════════════════════════════════════
function MobileEditor({ content, filename, onChange, fontSize }) {
  const [status, setStatus] = useState('');
  const taRef  = useRef(null);
  const lang   = filename ? fileLang(filename) : '';
  const lines  = content ? content.split('\n').length : 0;
  const chars  = content ? content.length : 0;

  function flash(msg) { setStatus(msg); setTimeout(() => setStatus(''), 2500); }

  async function doPaste() {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text);
      flash(`✅ Pasted ${text.split('\n').length} lines`);
    } catch {
      taRef.current?.focus();
      flash('Long-press inside editor → Paste');
    }
  }

  async function doCopy() {
    try {
      await navigator.clipboard.writeText(content || '');
      flash('✅ Copied to clipboard');
    } catch {
      taRef.current?.select();
      flash('Select all → Copy');
    }
  }

  function doClear() {
    if (!content) { flash('Already empty'); return; }
    if (window.confirm(`Clear "${filename}"?`)) { onChange(''); flash('✅ Cleared'); }
  }

  function onKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta  = taRef.current;
      const s   = ta.selectionStart, end = ta.selectionEnd;
      const val = content.substring(0, s) + '  ' + content.substring(end);
      onChange(val);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
    }
  }

  if (!filename) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#070d19', color:'#3d6080', fontSize:13, flexDirection:'column', gap:8 }}>
      <span style={{ fontSize:32 }}>📄</span>
      No file open — select from Files tab
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#070d19' }}>
      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', background:'#0d1f35', borderBottom:'1px solid #1e3a5c', flexWrap:'wrap', flexShrink:0 }}>
        <span style={{ fontSize:14 }}>{fileIcon(filename)}</span>
        <span style={{ color:'#00d4cc', fontFamily:'monospace', fontSize:12, fontWeight:700, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {filename}
        </span>
        <span style={{ color:'#3d6080', fontSize:10, fontFamily:'monospace' }}>
          {lines}L · {chars}C
        </span>
        <MBtn onClick={doCopy}  color="#6a8fae">📋 Copy</MBtn>
        <MBtn onClick={doPaste} color="#00d4cc">📥 Paste</MBtn>
        <MBtn onClick={doClear} color="#f87171">🗑 Clear</MBtn>
        {status && (
          <span style={{ width:'100%', textAlign:'center', fontSize:11, color:'#34d399', padding:'2px 0', flexShrink:0 }}>
            {status}
          </span>
        )}
      </div>

      {/* Textarea */}
      <textarea
        ref={taRef}
        value={content || ''}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false} autoCorrect="off" autoCapitalize="off" autoComplete="off"
        data-gramm="false" data-gramm_editor="false"
        style={{
          flex:1, width:'100%', padding:12, resize:'none', border:'none', outline:'none',
          fontFamily:'JetBrains Mono, Fira Code, Cascadia Code, Consolas, monospace',
          fontSize:fontSize ?? 13, lineHeight:1.7,
          color:'#dde8f5', background:'#070d19',
          tabSize:2, WebkitOverflowScrolling:'touch',
        }}
      />
    </div>
  );
}

function MBtn({ onClick, color, children }) {
  return (
    <button onClick={onClick} style={{
      padding:'4px 10px', borderRadius:5, border:`1px solid ${color}40`,
      background:`${color}10`, color, fontSize:11, fontWeight:700,
      cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
    }}>{children}</button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Monaco wrapper (lazy-loaded desktop only)
// ════════════════════════════════════════════════════════════════════════════
function MonacoWrapper({ content, language, onChange, settings, activeFile }) {
  const [MonacoEditor, setMonacoEditor] = useState(null);
  const monacoRef = useRef(null);

  useEffect(() => {
    import('@monaco-editor/react').then(m => setMonacoEditor(() => m.default));
  }, []);

  if (!MonacoEditor) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#070d19', color:'#6a8fae', fontSize:13, gap:10 }}>
      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4cc" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      Loading Monaco…
    </div>
  );

  function beforeMount(monaco) {
    monacoRef.current = monaco;
    monaco.editor.defineTheme('webide-dark', MONACO_THEME);
    const opts = { jsx: monaco.languages.typescript.JsxEmit.React, allowJs:true, esModuleInterop:true };
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(opts);
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions(opts);
  }

  function onMount(editor, monaco) {
    monaco.editor.setTheme('webide-dark');
    // Ctrl+S → format
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
      editor.getAction('editor.action.formatDocument')?.run());
    // Ctrl+/ → toggle comment
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () =>
      editor.getAction('editor.action.commentLine')?.run());
  }

  return (
    <MonacoEditor
      key={activeFile}
      height="100%" width="100%"
      language={language} value={content}
      beforeMount={beforeMount} onMount={onMount} onChange={onChange}
      theme="webide-dark"
      options={{
        fontFamily:    'JetBrains Mono, Fira Code, Cascadia Code, Consolas, monospace',
        fontLigatures: true,
        fontSize:      settings.fontSize ?? 14,
        lineHeight:    1.7,
        tabSize:       Number(settings.tabSize) || 2,
        wordWrap:      settings.wordWrap ? 'on' : 'off',
        minimap:       { enabled: settings.minimap ?? false },
        lineNumbers:   (settings.lineNumbers ?? true) ? 'on' : 'off',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        glyphMargin:   false,
        folding:       true,
        cursorStyle:   'line',
        cursorBlinking:'smooth',
        smoothScrolling: true,
        renderLineHighlight: 'line',
        formatOnPaste: true,
        autoClosingBrackets: 'always',
        autoClosingQuotes:   'always',
        bracketPairColorization: { enabled:true },
        padding:     { top:12, bottom:12 },
        scrollbar:   { verticalScrollbarSize:5, horizontalScrollbarSize:5, useShadows:false },
        suggest:     { showWords:false },
        quickSuggestions: true,
        'semanticHighlighting.enabled': true,
      }}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Main export — auto-switches based on screen size
// ════════════════════════════════════════════════════════════════════════════
export default function CodeEditor() {
  const { files, activeFile, updateFile, settings } = useIDEStore();
  const [useMobile, setUseMobile] = useState(isTouchDevice());

  useEffect(() => {
    const h = () => setUseMobile(window.innerWidth < 900);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const content  = activeFile ? (files[activeFile] ?? '') : '';
  const language = activeFile ? fileLang(activeFile) : 'plaintext';

  const handleChange = useCallback(value => {
    if (activeFile && value !== undefined) updateFile(activeFile, value);
  }, [activeFile, updateFile]);

  if (useMobile) {
    return (
      <MobileEditor
        content={content} filename={activeFile}
        onChange={handleChange} fontSize={settings.fontSize}
      />
    );
  }

  return (
    <div style={{ width:'100%', height:'100%', background:'#070d19' }}>
      <MonacoWrapper
        content={content} language={language}
        onChange={handleChange} settings={settings}
        activeFile={activeFile}
      />
    </div>
  );
}

