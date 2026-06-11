/**
 * CodeEditor.jsx v2
 * Modified for APK / Cordova Mobile Experience
 * Monaco Editor is now forced on mobile with touch-friendly options
 */
import { useRef, useCallback, useEffect, useState } from 'react';
import useIDEStore from '../../store/useIDEStore';
import { fileLang, fileIcon } from '../../utils/fileSystem';

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
// Monaco wrapper (Lazy-loaded and Mobile-Optimized)
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
      Loading Editor…
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* File Header (Optional: Keep it if you want the filename visible at the top) */}
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', background:'#0d1f35', borderBottom:'1px solid #1e3a5c', flexShrink:0 }}>
        <span style={{ fontSize:14 }}>{fileIcon(activeFile)}</span>
        <span style={{ color:'#00d4cc', fontFamily:'monospace', fontSize:12, fontWeight:700 }}>
          {activeFile}
        </span>
      </div>

      <MonacoEditor
        key={activeFile}
        height="100%" width="100%"
        language={language} value={content}
        beforeMount={beforeMount} onMount={onMount} onChange={onChange}
        theme="webide-dark"
        options={{
          fontFamily:    'JetBrains Mono, Fira Code, Cascadia Code, Consolas, monospace',
          fontLigatures: true,
          fontSize:      settings.fontSize ?? 15, // تكبير الخط قليلاً للهاتف
          lineHeight:    1.7,
          tabSize:       Number(settings.tabSize) || 2,
          wordWrap:      'on', // إجبار التفاف النص لمنع التمرير الأفقي
          minimap:       { enabled: false }, // تعطيل الخريطة لتوفير المساحة
          lineNumbers:   (settings.lineNumbers ?? true) ? 'on' : 'off',
          lineNumbersMinChars: 3, // تقليل مساحة أرقام الأسطر
          contextmenu:   false, // هام: تعطيل قائمة المحرر للسماح بنسخ ولصق نظام الأندرويد
          scrollBeyondLastLine: false,
          automaticLayout: true, // للتوافق مع ظهور لوحة المفاتيح
          glyphMargin:   false,
          folding:       false, // تعطيل طي الأكواد لصعوبة لمسها
          cursorStyle:   'line',
          cursorBlinking:'smooth',
          smoothScrolling: true,
          renderLineHighlight: 'none', // إزالة تظليل السطر لتخفيف التشتت
          formatOnPaste: true,
          autoClosingBrackets: 'always',
          autoClosingQuotes:   'always',
          bracketPairColorization: { enabled:true },
          padding:     { top:12, bottom:12 },
          scrollbar:   { verticalScrollbarSize:6, horizontalScrollbarSize:6, useShadows:false },
          suggest:     { showWords:false },
          quickSuggestions: true,
          'semanticHighlighting.enabled': true,
        }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Main export
// ════════════════════════════════════════════════════════════════════════════
export default function CodeEditor() {
  const { files, activeFile, updateFile, settings } = useIDEStore();

  const content  = activeFile ? (files[activeFile] ?? '') : '';
  const language = activeFile ? fileLang(activeFile) : 'plaintext';

  const handleChange = useCallback(value => {
    if (activeFile && value !== undefined) updateFile(activeFile, value);
  }, [activeFile, updateFile]);

  if (!activeFile) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#070d19', color:'#3d6080', fontSize:13, flexDirection:'column', gap:8, height: '100%' }}>
      <span style={{ fontSize:32 }}>📄</span>
      No file open — select from Files tab
    </div>
  );

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
