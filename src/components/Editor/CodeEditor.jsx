/**
 * CodeEditor.jsx
 * ✅ على الموبايل: textarea بسيط + زر Paste + زر Clear (لا Monaco = لا كراش)
 * ✅ على الـ Desktop: Monaco Editor كامل
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import useIDEStore from '../../store/useIDEStore';
import { FILE_LANGUAGE_MAP } from '../../utils/defaultFiles';

function getExt(n)  { return n.split('.').pop().toLowerCase(); }
function getLang(n) { return FILE_LANGUAGE_MAP[getExt(n)] ?? 'plaintext'; }

// ─── كشف الموبايل ────────────────────────────────────────────────────────────
const isTouchDevice = () => window.innerWidth < 900 || navigator.maxTouchPoints > 0;

// ─── ثيم Monaco مخصص ─────────────────────────────────────────────────────────
const MONACO_THEME = {
  base: 'vs-dark', inherit: true,
  rules: [
    {token:'comment',foreground:'3d6080',fontStyle:'italic'},
    {token:'keyword',foreground:'00d4cc',fontStyle:'bold'},
    {token:'string', foreground:'34d399'},
    {token:'number', foreground:'fbbf24'},
    {token:'type',   foreground:'60a5fa'},
    {token:'function',foreground:'a78bfa'},
    {token:'tag',    foreground:'00d4cc'},
    {token:'attribute.name',foreground:'60a5fa'},
    {token:'attribute.value',foreground:'34d399'},
  ],
  colors: {
    'editor.background':              '#070d19',
    'editor.foreground':              '#dde8f5',
    'editor.lineHighlightBackground': '#0d1929',
    'editorLineNumber.foreground':    '#2a4d78',
    'editorLineNumber.activeForeground':'#6a8fae',
    'editor.selectionBackground':     '#1e3a5c',
    'editorCursor.foreground':        '#00d4cc',
    'editorWidget.background':        '#0d1929',
    'scrollbarSlider.background':     '#1e3a5c80',
    'scrollbarSlider.hoverBackground':'#2a4d7880',
    'input.background':               '#0d1929',
    'editor.findMatchBackground':     '#00d4cc30',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// محرر الموبايل — textarea + شريط أدوات
// ══════════════════════════════════════════════════════════════════════════════
function MobileEditor({ content, filename, onChange }) {
  const textareaRef = useRef(null);
  const [pasteStatus, setPasteStatus] = useState('');
  const lang = filename ? getLang(filename) : 'text';
  const lines = content ? content.split('\n').length : 0;

  // ── لصق من الحافظة ─────────────────────────────────────────────────────
  async function handlePaste() {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        onChange(text);
        setPasteStatus('✅ تم اللصق');
        setTimeout(() => setPasteStatus(''), 2000);
      } else {
        // fallback: ركّز على الـ textarea ليظهر القائمة المحلية
        textareaRef.current?.focus();
        textareaRef.current?.select();
        setPasteStatus('اضغط مطولاً للصق');
        setTimeout(() => setPasteStatus(''), 3000);
      }
    } catch (e) {
      // المستخدم رفض الإذن — نركّز لإظهار القائمة المحلية
      textareaRef.current?.focus();
      setPasteStatus('اضغط مطولاً للصق');
      setTimeout(() => setPasteStatus(''), 3000);
    }
  }

  // ── مسح المحتوى ────────────────────────────────────────────────────────
  function handleClear() {
    if (window.confirm(`هل تريد مسح محتوى "${filename}" كاملاً؟`)) {
      onChange('');
    }
  }

  // ── نسخ الكل ───────────────────────────────────────────────────────────
  async function handleCopyAll() {
    try {
      await navigator.clipboard.writeText(content || '');
      setPasteStatus('✅ تم النسخ');
    } catch {
      textareaRef.current?.select();
      setPasteStatus('اختر كل النص ونسخ');
    }
    setTimeout(() => setPasteStatus(''), 2000);
  }

  // ── Tab key ─────────────────────────────────────────────────────────────
  function handleKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      const newVal = content.substring(0, start) + '  ' + content.substring(end);
      onChange(newVal);
      // إعادة وضع cursor بعد المسافتين
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  }

  if (!filename) {
    return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                    background:'var(--ide-bg)', color:'var(--ide-textDim)', fontSize:13 }}>
        اختر ملفاً من قائمة الملفات
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--ide-bg)' }}>

      {/* ── شريط أدوات المحرر (موبايل) ────────────────────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            6,
        padding:        '6px 10px',
        background:     'var(--ide-elevated)',
        borderBottom:   '1px solid var(--ide-border)',
        flexWrap:       'wrap',
        flexShrink:     0,
      }}>
        {/* اسم الملف + اللغة */}
        <span style={{ color:'var(--ide-accent)', fontFamily:'monospace',
                       fontSize:12, fontWeight:700, flex:1, minWidth:0,
                       overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {filename}
        </span>
        <span style={{ color:'var(--ide-textDim)', fontSize:10,
                       background:'rgba(0,212,204,0.08)', padding:'2px 6px',
                       borderRadius:4, flexShrink:0 }}>
          {lang} · {lines} سطر
        </span>

        {/* زر نسخ الكل */}
        <EditorBtn onClick={handleCopyAll} color="var(--ide-textMuted)">
          📋 نسخ
        </EditorBtn>

        {/* زر لصق */}
        <EditorBtn onClick={handlePaste} color="var(--ide-accent)">
          📥 لصق
        </EditorBtn>

        {/* زر مسح */}
        <EditorBtn onClick={handleClear} color="var(--ide-error)">
          🗑️ مسح
        </EditorBtn>

        {/* حالة العملية */}
        {pasteStatus && (
          <span style={{ fontSize:11, color:'var(--ide-success)', width:'100%',
                         textAlign:'center', padding:'2px 0', flexShrink:0 }}>
            {pasteStatus}
          </span>
        )}
      </div>

      {/* ── منطقة الكتابة ──────────────────────────────────────── */}
      <textarea
        ref={textareaRef}
        value={content || ''}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        style={{
          flex:           1,
          width:          '100%',
          padding:        '12px',
          fontFamily:     'JetBrains Mono, Fira Code, Cascadia Code, Consolas, monospace',
          fontSize:       13,
          lineHeight:     1.7,
          color:          'var(--ide-text)',
          background:     'var(--ide-bg)',
          border:         'none',
          outline:        'none',
          resize:         'none',
          tabSize:        2,
          WebkitOverflowScrolling: 'touch',
          overflowY:      'auto',
        }}
      />
    </div>
  );
}

function EditorBtn({ onClick, color, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:      '5px 10px',
        borderRadius: 6,
        border:       `1px solid ${color}40`,
        background:   `${color}10`,
        color:        color,
        fontSize:     11,
        fontWeight:   600,
        cursor:       'pointer',
        flexShrink:   0,
        whiteSpace:   'nowrap',
      }}
    >
      {children}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// المكوّن الرئيسي — يختار Monaco أو Textarea حسب الجهاز
// ══════════════════════════════════════════════════════════════════════════════
export default function CodeEditor() {
  const {
    files, activeFile,
    updateFile,
    wordWrap, fontSize,
  } = useIDEStore();

  const [useMobile, setUseMobile] = useState(isTouchDevice());

  useEffect(() => {
    const h = () => setUseMobile(window.innerWidth < 900);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const content  = activeFile ? (files[activeFile] ?? '') : '';
  const language = activeFile ? getLang(activeFile) : 'plaintext';

  const handleChange = useCallback((value) => {
    if (activeFile && value !== undefined) updateFile(activeFile, value);
  }, [activeFile, updateFile]);

  // ── موبايل: textarea ─────────────────────────────────────────────────────
  if (useMobile) {
    return (
      <MobileEditor
        content={content}
        filename={activeFile}
        onChange={handleChange}
      />
    );
  }

  // ── ديسكتوب: Monaco Editor ───────────────────────────────────────────────
  // نحمّل Monaco بشكل lazy لأنه كبير الحجم
  return <MonacoWrapper
    key={activeFile}
    content={content}
    language={language}
    onChange={handleChange}
    wordWrap={wordWrap}
    fontSize={fontSize}
    activeFile={activeFile}
  />;
}

// ── Monaco يُحمَّل lazy لمنع تأثيره على الموبايل ────────────────────────────
function MonacoWrapper({ content, language, onChange, wordWrap, fontSize, activeFile }) {
  const [MonacoEditor, setMonacoEditor] = useState(null);
  const monacoRef = useRef(null);

  useEffect(() => {
    import('@monaco-editor/react').then(m => setMonacoEditor(() => m.default));
  }, []);

  if (!MonacoEditor) {
    return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                    background:'var(--ide-bg)', color:'var(--ide-textMuted)', fontSize:13 }}>
        <span>⏳ جاري تحميل المحرر…</span>
      </div>
    );
  }

  function beforeMount(monaco) {
    monacoRef.current = monaco;
    monaco.editor.defineTheme('webide-dark', MONACO_THEME);
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      jsx: monaco.languages.typescript.JsxEmit.React,
      allowJs: true, esModuleInterop: true,
    });
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      jsx: monaco.languages.typescript.JsxEmit.React,
      allowJs: true, esModuleInterop: true,
    });
  }

  function onMount(editor, monaco) {
    monaco.editor.setTheme('webide-dark');
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      editor.getAction('editor.action.formatDocument')?.run();
    });
  }

  return (
    <div style={{ width:'100%', height:'100%', background:'var(--ide-bg)' }}>
      <MonacoEditor
        height="100%" width="100%"
        language={language}
        value={content}
        beforeMount={beforeMount}
        onMount={onMount}
        onChange={onChange}
        theme="webide-dark"
        options={{
          fontFamily:    'JetBrains Mono, Fira Code, Consolas, monospace',
          fontLigatures: true,
          fontSize,
          lineHeight:    1.7,
          tabSize:       2,
          wordWrap:      wordWrap ? 'on' : 'off',
          minimap:       { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          lineNumbers:   'on',
          glyphMargin:   false,
          folding:       true,
          cursorStyle:   'line',
          cursorBlinking:'smooth',
          smoothScrolling: true,
          renderLineHighlight: 'line',
          formatOnPaste: true,
          autoClosingBrackets: 'always',
          autoClosingQuotes:   'always',
          bracketPairColorization: { enabled: true },
          padding:       { top: 12, bottom: 12 },
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
        }}
      />
    </div>
  );
}
