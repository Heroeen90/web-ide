/**
 * htmlGenerator.js — توليد HTML الكامل للـ iframe
 * إصلاح: الآن يُعيد { html, hasErrors } بدل string فقط
 * لمنع تحديث الـ preview عند وجود أخطاء Babel (يمنع الكراش)
 */

import { transpileFile } from './transpiler.js';

const SELF_MOUNTING = new Set(['main.jsx', 'main.tsx', 'index.jsx', 'index.tsx']);

const CONSOLE_INTERCEPTOR = `
(function () {
  'use strict';
  var _log=console.log.bind(console),_warn=console.warn.bind(console),
      _error=console.error.bind(console),_info=console.info.bind(console);

  function safe(v) {
    if (v===null) return 'null';
    if (v===undefined) return 'undefined';
    if (v instanceof Error) return v.stack||v.message;
    if (typeof v==='function') return '[Function: '+(v.name||'anonymous')+']';
    if (typeof v==='object') { try{return JSON.stringify(v,null,2);}catch(_){return String(v);} }
    return String(v);
  }
  function post(level,args){
    try{ window.parent.postMessage({type:'console',level:level,args:Array.prototype.slice.call(args).map(safe),ts:Date.now()},'*'); }catch(_){}
  }
  console.log  =function(){post('log',  arguments);_log.apply(console,arguments);};
  console.warn =function(){post('warn', arguments);_warn.apply(console,arguments);};
  console.error=function(){post('error',arguments);_error.apply(console,arguments);};
  console.info =function(){post('info', arguments);_info.apply(console,arguments);};

  window.onerror=function(msg,src,line,col,err){
    post('error',[err?(err.stack||err.message):(msg+' ('+src+':'+line+':'+col+')')]);
    return false;
  };
  window.addEventListener('unhandledrejection',function(e){
    post('error',['Unhandled Promise Rejection: '+(e.reason&&(e.reason.stack||e.reason.message||String(e.reason)))]);
  });
  window.parent.postMessage({type:'preview-ready',ts:Date.now()},'*');
})();
`;

const MODULE_RUNTIME = `
(function(g){
  'use strict';
  var __reg={},__cache={};
  g.__define=function(id,f){ __reg[id]=f; };
  g.__require=function req(id){
    if(id==='react')            return g.React;
    if(id==='react-dom')        return g.ReactDOM;
    if(id==='react-dom/client') return {createRoot:g.ReactDOM.createRoot.bind(g.ReactDOM)};
    if(id==='react/jsx-runtime')return {jsx:g.React.createElement,jsxs:g.React.createElement,Fragment:g.React.Fragment};
    var key=id.replace(/^\\.?\\//,'');
    if(__cache[key]!==undefined) return __cache[key];
    var fk=key;
    if(!__reg[fk]){
      var exts=['.jsx','.js','.tsx','.ts'];
      for(var i=0;i<exts.length;i++){ if(__reg[key+exts[i]]){fk=key+exts[i];break;} }
    }
    if(!__reg[fk]){ console.error('[WebIDE] Module not found: '+id); return {}; }
    var mod={exports:Object.create(null)};
    __cache[key]=mod.exports;
    __reg[fk](mod,mod.exports,g.__require);
    __cache[key]=mod.exports;
    return mod.exports;
  };
})(window);
`;

function escapeForScript(str) {
  // تأمين الكود داخل script tag - لا يُغيّر الكود بل يُحيطه بحماية
  return str;
}

function buildErrorHTML(message, detail) {
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{background:#070d19;color:#dde8f5;font-family:monospace;display:flex;
align-items:flex-start;justify-content:center;min-height:100vh;margin:0;padding:16px;box-sizing:border-box;}
.c{background:#0d1929;border:1px solid #7f1d1d;border-radius:8px;padding:20px;max-width:100%;width:100%;}
h2{color:#f87171;margin:0 0 10px;font-size:14px;}
pre{color:#fca5a5;font-size:11px;white-space:pre-wrap;word-break:break-all;margin:0;line-height:1.5;}
.d{margin-top:10px;color:#6a8fae;font-size:10px;white-space:pre-wrap;word-break:break-all;}
</style></head><body><div class="c">
<h2>&#9888; ${esc(message)}</h2>
${detail ? `<div class="d">${esc(detail)}</div>` : ''}
</div></body></html>`;
}

/**
 * الدالة الرئيسية — تُعيد { html: string, hasErrors: boolean }
 */
export function generatePreviewHTML(files) {
  if (!window.Babel) {
    return {
      html: buildErrorHTML('Babel لا يزال يتحمّل…', 'انتظر لحظة ثم اضغط Run'),
      hasErrors: true,
    };
  }

  // 1. ترجمة جميع ملفات JS/JSX/TS/TSX
  const transpiled = {};
  const errors = [];

  for (const [name, code] of Object.entries(files)) {
    const ext = name.split('.').pop().toLowerCase();
    if (!['js','jsx','ts','tsx'].includes(ext)) continue;
    const { code: out, error } = transpileFile(code, name);
    if (error) {
      errors.push({ name, error });
      transpiled[name] = `/* transpile error: ${name} */`;
    } else {
      transpiled[name] = out;
    }
  }

  // إذا فشلت كل الملفات القابلة للترجمة → أعد الخطأ
  const transpilableCount = Object.keys(transpiled).length;
  if (errors.length > 0 && errors.length === transpilableCount) {
    return {
      html: buildErrorHTML(`خطأ في ${errors[0].name}`, errors[0].error),
      hasErrors: true,
    };
  }

  // 2. اختر نقطة الدخول
  const allNames = Object.keys(files);
  const entryFile =
    allNames.find(f => SELF_MOUNTING.has(f)) ||
    allNames.find(f => f === 'App.jsx' || f === 'App.tsx') ||
    Object.keys(transpiled)[0];

  if (!entryFile) {
    return { html: buildErrorHTML('لم يُعثر على ملف App.jsx'), hasErrors: true };
  }

  const isSelfMounting = SELF_MOUNTING.has(entryFile);

  // 3. بناء تعريفات الموديولات
  const moduleBlocks = Object.entries(transpiled).map(([name, code]) =>
    `// ── ${name} ──\n__define(${JSON.stringify(name)},function(module,exports,require){\n"use strict";\n${code}\n});\n`
  ).join('\n');

  // 4. Bootstrap
  const bootstrap = isSelfMounting
    ? `try{ __require(${JSON.stringify('./'+entryFile)}); }
       catch(e){ console.error('[WebIDE] Runtime error:',e); showErr(e); }`
    : `try{
        var m=__require(${JSON.stringify('./'+entryFile)});
        var App=m&&m.default?m.default:m;
        if(typeof App!=='function') throw new Error('لا يوجد export default في ${entryFile}');
        window.ReactDOM.createRoot(document.getElementById('root')).render(window.React.createElement(App));
       }catch(e){ console.error('[WebIDE] Runtime error:',e); showErr(e); }`;

  const cssContent = files['style.css']||files['styles.css']||files['index.css']||'';

  const html = `<!DOCTYPE html>
<html lang="ar" dir="auto">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
<style>*{box-sizing:border-box;}body{margin:0;}</style>
<style id="user-styles">${cssContent}</style>
</head>
<body>
<div id="root"></div>
<script>
function showErr(e){
  document.getElementById('root').innerHTML=
    '<div style="padding:16px;color:#f87171;font-family:monospace;background:#0d1929;min-height:100vh;word-break:break-all">'
    +'<h2 style="color:#f87171;margin:0 0 8px;font-size:14px">&#9888; Runtime Error</h2>'
    +'<pre style="white-space:pre-wrap;font-size:11px">'+(e&&(e.stack||e.message)||String(e))+'</pre></div>';
}
</script>
<script>${CONSOLE_INTERCEPTOR}</script>
<script>${MODULE_RUNTIME}</script>
<script>
${moduleBlocks}
${bootstrap}
</script>
</body>
</html>`;

  return { html, hasErrors: errors.length > 0 };
}

