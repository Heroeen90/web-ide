/**
 * StatusBar.jsx v2 — Bottom status bar
 */
import useIDEStore from '../../store/useIDEStore';
import { fileLang, pathExtname, pathBasename } from '../../utils/fileSystem';

const LANG_DISPLAY = {
  javascript:'JavaScript', typescript:'TypeScript', css:'CSS',
  html:'HTML', json:'JSON', markdown:'Markdown', xml:'XML', plaintext:'Plain Text',
};

export default function StatusBar({ babelReady, isRunning }) {
  const { activeFile, files, settings, consoleLogs, isConsoleOpen, toggleConsole, isPreviewOpen, togglePreview } = useIDEStore();

  const language  = activeFile ? fileLang(activeFile) : 'plaintext';
  const langLabel = LANG_DISPLAY[language] ?? language;
  const content   = activeFile ? (files[activeFile] ?? '') : '';
  const lines     = content.split('\n').length;
  const bytes     = new TextEncoder().encode(content).length;
  const fileSize  = bytes < 1024 ? `${bytes}B` : `${(bytes/1024).toFixed(1)}KB`;
  const errors    = consoleLogs.filter(l => l.level === 'error').length;
  const warns     = consoleLogs.filter(l => l.level === 'warn').length;

  return (
    <div style={{
      display:'flex', alignItems:'center', height:22, padding:'0 10px',
      background:'#0a1628', borderTop:'1px solid #1e3a5c',
      color:'#3d6080', fontSize:10, fontFamily:'monospace', flexShrink:0,
      gap:12, userSelect:'none',
    }}>
      {/* Left */}
      <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
        <Dot color={babelReady ? '#34d399' : '#fbbf24'} />
        <span style={{ color: babelReady ? '#34d399' : '#fbbf24' }}>
          {babelReady ? 'Babel Ready' : isRunning ? 'Building…' : 'Loading…'}
        </span>
        {isRunning && <span style={{ color:'#fbbf24' }}>⟳ Building</span>}
      </div>

      {/* Center — errors & warns */}
      <div style={{ display:'flex', gap:8 }}>
        {errors > 0 && <span style={{ color:'#f87171', cursor:'pointer' }} onClick={toggleConsole}>✕ {errors}</span>}
        {warns  > 0 && <span style={{ color:'#fbbf24', cursor:'pointer' }} onClick={toggleConsole}>⚠ {warns}</span>}
      </div>

      {/* Right */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {activeFile && (
          <>
            <span>{pathBasename(activeFile)}</span>
            <Sep/><span>{lines}L</span>
            <Sep/><span>{fileSize}</span>
            <Sep/><span>UTF-8</span>
            <Sep/><span>Spaces: {settings.tabSize ?? 2}</span>
            <Sep/>
            <span style={{ color:'#00d4cc' }}>{langLabel}</span>
            <Sep/><span>Fs:{settings.fontSize}px</span>
          </>
        )}
        <Sep/>
        <span style={{ cursor:'pointer', color: isConsoleOpen?'#6a8fae':'#3d6080' }} onClick={toggleConsole} title="Toggle Console">⬛</span>
        <span style={{ cursor:'pointer', color: isPreviewOpen?'#6a8fae':'#3d6080' }} onClick={togglePreview} title="Toggle Preview">⊞</span>
      </div>
    </div>
  );
}

const Sep = () => <span style={{ opacity:.3 }}>│</span>;
const Dot = ({ color }) => <span style={{ width:6, height:6, borderRadius:'50%', background:color, display:'inline-block' }} />;
