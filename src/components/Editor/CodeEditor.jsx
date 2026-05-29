/**
 * CodeEditor.jsx — Monaco Editor wrapper with custom theme & keyboard shortcuts
 */
import { useRef, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import useIDEStore from '../../store/useIDEStore';
import { FILE_LANGUAGE_MAP } from '../../utils/defaultFiles';

function getExt(name)  { return name.split('.').pop().toLowerCase(); }
function getLang(name) { return FILE_LANGUAGE_MAP[getExt(name)] ?? 'plaintext'; }

// ─── Custom Monaco theme matching the IDE color palette ───────────────────────
const THEME_DATA = {
  base:    'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment',       foreground: '3d6080', fontStyle: 'italic' },
    { token: 'keyword',       foreground: '00d4cc', fontStyle: 'bold'   },
    { token: 'string',        foreground: '34d399' },
    { token: 'number',        foreground: 'fbbf24' },
    { token: 'type',          foreground: '60a5fa' },
    { token: 'class',         foreground: '60a5fa', fontStyle: 'bold' },
    { token: 'function',      foreground: 'a78bfa' },
    { token: 'variable',      foreground: 'dde8f5' },
    { token: 'constant',      foreground: 'fb923c' },
    { token: 'tag',           foreground: '00d4cc' },
    { token: 'attribute.name',foreground: '60a5fa' },
    { token: 'attribute.value',foreground: '34d399' },
    { token: 'delimiter',     foreground: '6a8fae' },
    { token: 'operator',      foreground: '6a8fae' },
    { token: 'punctuation',   foreground: '6a8fae' },
  ],
  colors: {
    'editor.background':              '#070d19',
    'editor.foreground':              '#dde8f5',
    'editor.lineHighlightBackground': '#0d1929',
    'editorLineNumber.foreground':    '#2a4d78',
    'editorLineNumber.activeForeground': '#6a8fae',
    'editor.selectionBackground':     '#1e3a5c',
    'editor.inactiveSelectionBackground': '#122033',
    'editorCursor.foreground':        '#00d4cc',
    'editorWhitespace.foreground':    '#1e3a5c',
    'editorIndentGuide.background':   '#122033',
    'editorIndentGuide.activeBackground': '#1e3a5c',
    'editorWidget.background':        '#0d1929',
    'editorSuggestWidget.background': '#0d1929',
    'editorSuggestWidget.border':     '#1e3a5c',
    'editorSuggestWidget.selectedBackground': '#122033',
    'scrollbar.shadow':               '#00000080',
    'scrollbarSlider.background':     '#1e3a5c80',
    'scrollbarSlider.hoverBackground':'#2a4d7880',
    'scrollbarSlider.activeBackground':'#2a4d78',
    'input.background':               '#0d1929',
    'input.border':                   '#1e3a5c',
    'input.foreground':               '#dde8f5',
    'focusBorder':                    '#00d4cc40',
    'editor.findMatchBackground':     '#00d4cc30',
    'editor.findMatchHighlightBackground': '#00d4cc15',
    'editorBracketMatch.background':  '#1e3a5c80',
    'editorBracketMatch.border':      '#00d4cc60',
    'list.hoverBackground':           '#0d1929',
    'list.activeSelectionBackground': '#122033',
  },
};

export default function CodeEditor() {
  const {
    files, activeFile,
    updateFile,
    wordWrap, fontSize,
  } = useIDEStore();

  const monacoRef = useRef(null);
  const editorRef = useRef(null);

  const content  = activeFile ? (files[activeFile] ?? '') : '';
  const language = activeFile ? getLang(activeFile) : 'plaintext';

  // ── Define theme before mount ──────────────────────────────────────────
  function handleBeforeMount(monaco) {
    monacoRef.current = monaco;
    monaco.editor.defineTheme('webide-dark', THEME_DATA);

    // Configure TypeScript/JavaScript defaults for better JSX support
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      jsx:               monaco.languages.typescript.JsxEmit.React,
      jsxFactory:        'React.createElement',
      allowJs:           true,
      allowSyntheticDefaultImports: true,
      esModuleInterop:   true,
      target:            monaco.languages.typescript.ScriptTarget.ESNext,
      module:            monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution:  monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    });

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      jsx:             monaco.languages.typescript.JsxEmit.React,
      jsxFactory:      'React.createElement',
      allowJs:         true,
      esModuleInterop: true,
      target:          monaco.languages.typescript.ScriptTarget.ESNext,
    });

    // Suppress "Cannot find module 'react'" errors
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation:   false,
    });

    // Add React type stubs so intellisense works
    const reactTypes = `
      declare module 'react' {
        export function useState<T>(initial: T): [T, (v: T | ((prev: T) => T)) => void];
        export function useEffect(fn: () => void | (() => void), deps?: any[]): void;
        export function useRef<T>(initial?: T): { current: T };
        export function useCallback<T extends Function>(fn: T, deps: any[]): T;
        export function useMemo<T>(fn: () => T, deps: any[]): T;
        export function useContext<T>(ctx: React.Context<T>): T;
        export function createContext<T>(def: T): React.Context<T>;
        export function memo<T>(comp: T): T;
        export function forwardRef<T, P>(render: (props: P, ref: any) => JSX.Element): (props: P & { ref?: any }) => JSX.Element;
        export const Fragment: unique symbol;
        export function createElement(type: any, props?: any, ...children: any[]): JSX.Element;
        export default React;
        namespace React { interface Context<T> { Provider: any; Consumer: any; } }
      }
      declare namespace JSX {
        interface Element {}
        interface IntrinsicElements { [elem: string]: any; }
      }
    `;
    monaco.languages.typescript.typescriptDefaults.addExtraLib(reactTypes, 'react-types.d.ts');
    monaco.languages.typescript.javascriptDefaults.addExtraLib(reactTypes, 'react-types.d.ts');
  }

  // ── On editor mount ────────────────────────────────────────────────────
  function handleMount(editor, monaco) {
    editorRef.current = editor;
    monaco.editor.setTheme('webide-dark');

    // Ctrl+S → format document
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      editor.getAction('editor.action.formatDocument')?.run();
    });

    // Ctrl+/ → toggle comment
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      editor.getAction('editor.action.commentLine')?.run();
    });
  }

  const handleChange = useCallback((value) => {
    if (activeFile && value !== undefined) {
      updateFile(activeFile, value);
    }
  }, [activeFile, updateFile]);

  // ─────────────────────────────────────────────────────────────────────────
  if (!activeFile) {
    return (
      <div
        className="flex-1 flex items-center justify-center h-full"
        style={{ background: 'var(--ide-bg)', color: 'var(--ide-textDim)' }}
      >
        <div className="text-center">
          <div className="text-4xl mb-3 opacity-30">📄</div>
          <p className="text-sm">No file open</p>
          <p className="text-xs mt-1 opacity-60">Select a file from the explorer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden" style={{ background: 'var(--ide-bg)' }}>
      <MonacoEditor
        key={`${activeFile}-editor`}   // remount when file changes to avoid stale model
        height="100%"
        width="100%"
        language={language}
        value={content}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        onChange={handleChange}
        theme="webide-dark"
        loading={
          <div className="h-full flex items-center justify-center"
               style={{ background: 'var(--ide-bg)', color: 'var(--ide-textMuted)' }}>
            <div className="flex items-center gap-2 text-sm">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83
                         M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              Loading editor…
            </div>
          </div>
        }
        options={{
          fontFamily:         'JetBrains Mono, Fira Code, Cascadia Code, Consolas, monospace',
          fontLigatures:      true,
          fontSize:           fontSize,
          lineHeight:         1.7,
          tabSize:            2,
          insertSpaces:       true,
          wordWrap:           wordWrap ? 'on' : 'off',
          minimap:            { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout:    true,
          lineNumbers:        'on',
          glyphMargin:        false,
          folding:            true,
          cursorStyle:        'line',
          cursorBlinking:     'smooth',
          smoothScrolling:    true,
          renderLineHighlight:'line',
          formatOnPaste:      true,
          formatOnType:       false,
          autoClosingBrackets:'always',
          autoClosingQuotes:  'always',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs:          true,
            indentation:           true,
          },
          padding:            { top: 12, bottom: 12 },
          scrollbar: {
            verticalScrollbarSize:   6,
            horizontalScrollbarSize: 6,
            useShadows:              false,
          },
          suggest: {
            showWords:    false,
            insertMode:   'replace',
          },
          quickSuggestions: { other: true, comments: false, strings: false },
          acceptSuggestionOnCommitCharacter: true,
          contextmenu:        true,
          copyWithSyntaxHighlighting: true,
          'semanticHighlighting.enabled': true,
        }}
      />
    </div>
  );
}
