/**
 * htmlGenerator.js v2 — Multi-folder support + robust error handling
 */
import { transpileFile } from './transpiler.js';
import { pathDirname, resolveImport, pathExtname } from './fileSystem.js';

const SELF_MOUNTING = new Set(['main.jsx','main.tsx','index.jsx','index.tsx']);

const CONSOLE_INTERCEPTOR = `(function(){
  var _l=console.log.bind(console),_w=console.warn.bind(console),
      _e=console.error.bind(console),_i=console.info.bind(console);
  function safe(v){
    if(v===null)return'null';if(v===undefined)return'undefined';
    if(v instanceof Error)return v.stack||v.message;
    if(typeof v==='function')return'[Function: '+(v.name||'anonymous')+']';
    if(typeof v==='object'){try{return JSON.stringify(v,null,2);}catch(e){return String(v);}}
    return String(v);
  }
  function post(level,args){
    try{window.parent.postMessage({type:'console',level:level,
      args:Array.prototype.slice.call(args).map(safe),ts:Date.now()},'*');}catch(e){}
  }
  console.log  =function(){post('log',  arguments);_l.apply(console,arguments);};
  console.warn =function(){post('warn', arguments);_w.apply(console,arguments);};
  console.error=function(){post('error',arguments);_e.apply(console,arguments);};
  console.info =function(){post('info', arguments);_i.apply(console,arguments);};
  window.onerror=function(m,s,l,c,e){
    post('error',[e?(e.stack||e.message):(m+'('+s+':'+l+':'+c+')')]);return false;
  };
  window.addEventListener('unhandledrejection',function(e){
    post('error',['Unhandled Promise Rejection:'+(e.reason&&(e.reason.stack||e.reason.message||String(e.reason)))]);
  });
  window.parent.postMessage({type:'preview-ready',ts:Date.now()},'*');
})();`;

const MODULE_RUNTIME = `(function(g){
  var __reg={},__cache={};
  g.__define=function(id,f){__reg[id]=f;};
  g.__require=function req(id,fromFile){
    if(id==='react')return g.React;
    if(id==='react-dom')return g.ReactDOM;
    if(id==='react-dom/client')return{createRoot:g.ReactDOM.createRoot.bind(g.ReactDOM)};
    if(id==='react/jsx-runtime')return{jsx:g.React.createElement,jsxs:g.React.createElement,Fragment:g.React.Fragment};

    // Resolve relative imports
    var key=id;
    if(id.startsWith('.')){
      var dir=fromFile?fromFile.replace(/\\/[^\\/]*$/,''):'';
      key=dir?(dir+'/'+id).replace(/\\/\\.\\/|^\\.\\//g,'/'):id.replace(/^\\.\\//,'');
      // Normalize ..
      var parts=key.split('/'),stack=[];
      for(var i=0;i<parts.length;i++){
        if(parts[i]==='..')stack.pop();
        else if(parts[i]!=='.'&&parts[i]!=='')stack.push(parts[i]);
      }
      key=stack.join('/');
    }

    if(__cache[key]!==undefined)return __cache[key];
    var fk=key;
    if(!__reg[fk]){
      var exts=['.jsx','.js','.tsx','.ts','/index.jsx','/index.js','/index.tsx','/index.ts'];
      for(var i=0;i<exts.length;i++){if(__reg[key+exts[i]]){fk=key+exts[i];break;}}
    }
    if(!__reg[fk]){console.error('[WebIDE] Module not found: '+id);return{};}
    var mod={exports:Object.create(null)};
    __cache[key]=mod.exports;
    __reg[fk](mod,mod.exports,function(dep){return req(dep,fk);});
    __cache[key]=mod.exports;
    return mod.exports;
  };
})(window);`;

function errHTML(msg, detail) {
  const e = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{background:#070d19;color:#dde8f5;font-family:monospace;padding:20px;margin:0;word-break:break-all;}
.box{background:#0d1929;border:1px solid #7f1d1d;border-radius:8px;padding:20px;max-width:100%;}
h2{color:#f87171;margin:0 0 10px;font-size:14px;}
pre{color:#fca5a5;font-size:12px;white-space:pre-wrap;margin:0;line-height:1.6;}
.d{margin-top:10px;color:#6a8fae;font-size:11px;white-space:pre-wrap;}
</style></head><body><div class="box">
<h2>&#9888; ${e(msg)}</h2>
${detail ? `<div class="d">${e(detail)}</div>` : ''}</div></body></html>`;
}

export function generatePreviewHTML(files) {
  if (!window.Babel) {
    return { html: errHTML('Babel is loading…', 'Wait a moment then press Run'), hasErrors: true };
  }

  // 1. Transpile JS/JSX/TS/TSX
  const transpiled = {};
  const errors     = [];

  for (const [name, code] of Object.entries(files)) {
    const ext = pathExtname(name);
    if (!['js','jsx','ts','tsx'].includes(ext)) continue;
    const { code: out, error } = transpileFile(code, name);
    if (error) { errors.push({ name, error }); transpiled[name] = `/* error in ${name} */`; }
    else transpiled[name] = out;
  }

  const tc = Object.keys(transpiled).length;
  if (tc > 0 && errors.length === tc) {
    return { html: errHTML(`Transpile error in ${errors[0].name}`, errors[0].error), hasErrors: true };
  }

  // 2. Entry point
  const allNames = Object.keys(files);
  const entryFile =
    allNames.find(f => SELF_MOUNTING.has(f)) ||
    allNames.find(f => f === 'App.jsx' || f === 'App.tsx') ||
    allNames.find(f => f === 'app.jsx' || f === 'app.tsx') ||
    Object.keys(transpiled)[0];

  if (!entryFile) return { html: errHTML('No entry file found. Create App.jsx.'), hasErrors: true };

  const isSelf = SELF_MOUNTING.has(entryFile);

  // 3. Module definitions — pass filename to __define for relative import resolution
  const mods = Object.entries(transpiled).map(([name, code]) =>
    `__define(${JSON.stringify(name)},function(module,exports,require){\n"use strict";\n${code}\n});`
  ).join('\n');

  // 4. Bootstrap
  const boot = isSelf
    ? `try{__require(${JSON.stringify('./'+entryFile)},null);}catch(e){showErr(e);console.error(e);}`
    : `try{
        var m=__require(${JSON.stringify('./'+entryFile)},null);
        var A=m&&m.default?m.default:m;
        if(typeof A!=='function')throw new Error('No default export in ${entryFile}');
        window.ReactDOM.createRoot(document.getElementById('root')).render(window.React.createElement(A));
       }catch(e){showErr(e);console.error('[WebIDE]',e);}`;

  // 5. Collect ALL CSS files
  const cssFiles = Object.entries(files)
    .filter(([n]) => pathExtname(n) === 'css')
    .map(([, c]) => c).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
<style>*{box-sizing:border-box;}body{margin:0;}</style>
<style>${cssFiles}</style>
</head><body>
<div id="root"></div>
<script>function showErr(e){var r=document.getElementById('root');if(r)r.innerHTML='<div style="padding:16px;color:#f87171;font-family:monospace;background:#0d1929;min-height:100vh;word-break:break-all"><h2 style="margin:0 0 8px;font-size:14px">&#9888; Runtime Error</h2><pre style="white-space:pre-wrap;font-size:12px">'+(e&&(e.stack||e.message||String(e)))+'</pre></div>';}</script>
<script>${CONSOLE_INTERCEPTOR}</script>
<script>${MODULE_RUNTIME}</script>
<script>${mods}
${boot}</script>
</body></html>`;

  return { html, hasErrors: errors.length > 0 };
}
