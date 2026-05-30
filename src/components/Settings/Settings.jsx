/**
 * Settings.jsx — Modal panel for IDE settings
 */
import useIDEStore from '../../store/useIDEStore';

const PREVIEW_MODES = [
  { id:'mobile',     label:'📱 Mobile (390px)'   },
  { id:'tablet',     label:'📟 Tablet (768px)'   },
  { id:'desktop',    label:'🖥️ Desktop (1280px)' },
  { id:'full',       label:'⬜ Full Width'        },
  { id:'responsive', label:'↔ Responsive'        },
];

export default function Settings() {
  const { settings, updateSetting, resetSettings, closeSettings } = useIDEStore();

  function Row({ label, children }) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #1e3a5c' }}>
        <span style={{ color:'#8bacc8', fontSize:13 }}>{label}</span>
        <div>{children}</div>
      </div>
    );
  }

  function Toggle({ k }) {
    return (
      <button onClick={() => updateSetting(k, !settings[k])} style={{
        width:42, height:22, borderRadius:11, border:'none', cursor:'pointer', position:'relative',
        background: settings[k] ? '#00d4cc' : '#1e3a5c', transition:'background .2s',
      }}>
        <span style={{
          position:'absolute', top:3, left: settings[k] ? 22 : 3, width:16, height:16,
          borderRadius:'50%', background:'#fff', transition:'left .2s',
        }}/>
      </button>
    );
  }

  function Select({ k, options }) {
    return (
      <select value={settings[k]} onChange={e => updateSetting(k, e.target.value)} style={{
        background:'#122033', border:'1px solid #1e3a5c', color:'#dde8f5',
        borderRadius:6, padding:'4px 8px', fontSize:12, cursor:'pointer', outline:'none',
      }}>
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    );
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
         onClick={e => e.target === e.currentTarget && closeSettings()}>
      <div style={{ background:'#0d1929', border:'1px solid #1e3a5c', borderRadius:14, width:'100%', maxWidth:460, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px #00000080' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #1e3a5c' }}>
          <span style={{ color:'#dde8f5', fontWeight:700, fontSize:16 }}>⚙️ Settings</span>
          <button onClick={closeSettings} style={{ background:'transparent', border:'none', color:'#6a8fae', fontSize:20, cursor:'pointer', lineHeight:1 }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ overflowY:'auto', flex:1, padding:'0 20px' }}>

          <Section title="Editor">
            <Row label="Font Size">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <button onClick={() => updateSetting('fontSize', Math.max(10, settings.fontSize - 1))} style={btnStyle}>−</button>
                <span style={{ color:'#00d4cc', fontFamily:'monospace', fontSize:14, minWidth:28, textAlign:'center' }}>{settings.fontSize}</span>
                <button onClick={() => updateSetting('fontSize', Math.min(28, settings.fontSize + 1))} style={btnStyle}>+</button>
              </div>
            </Row>
            <Row label="Tab Size">
              <Select k="tabSize" options={[{id:2,label:'2 spaces'},{id:4,label:'4 spaces'},{id:'tab',label:'Tab'}]} />
            </Row>
            <Row label="Word Wrap">     <Toggle k="wordWrap"    /></Row>
            <Row label="Line Numbers">  <Toggle k="lineNumbers" /></Row>
            <Row label="Minimap">       <Toggle k="minimap"     /></Row>
          </Section>

          <Section title="Preview">
            <Row label="Default Mode">
              <Select k="previewTheme" options={PREVIEW_MODES} />
            </Row>
          </Section>

          <Section title="Behavior">
            <Row label="Auto Refresh">  <Toggle k="autoRefresh" /></Row>
            <Row label="Auto Save">     <Toggle k="autoSave"    /></Row>
          </Section>
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid #1e3a5c', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button onClick={resetSettings} style={{ ...btnStyle, color:'#f87171', borderColor:'rgba(248,113,113,0.3)', padding:'7px 14px', borderRadius:7 }}>
            Reset Defaults
          </button>
          <button onClick={closeSettings} style={{ background:'#00d4cc', border:'none', color:'#070d19', fontWeight:700, fontSize:13, padding:'7px 20px', borderRadius:7, cursor:'pointer' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:4 }}>
      <div style={{ color:'#00d4cc', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', padding:'14px 0 4px' }}>{title}</div>
      {children}
    </div>
  );
}

const btnStyle = {
  background:'#122033', border:'1px solid #1e3a5c', color:'#dde8f5',
  borderRadius:5, padding:'4px 10px', cursor:'pointer', fontSize:13, fontFamily:'monospace',
};
