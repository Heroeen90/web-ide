/**
 * useIDEStore.js — Central Zustand Store (v4 - Multi-Project Enterprise)
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ الإصلاح النهائي للجذور:
 * 1. دمج كامل بين إدارة المشاريع وشجرة الملفات الافتراضية لمنع تعليق الكود القديم.
 * 2. تمكين التحديث الحقيقي الفوري لملفات ومجلدات المشروع المختار.
 * 3. تمكين الحذف، الإضافة، وتعديل الكود داخل أي مشروع جديد بنجاح.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// الملفات المبدئية لأي مشروع جديد تنشئه لكي يبدأ نظيفاً ويعمل فوراً في المعاينة
const createDefaultStarterFiles = (projectName) => ({
  "App.jsx": `import React, { useState } from 'react';\n\nexport default function App() {\n  const [text, setText] = useState("مرحباً بك في ${projectName}");\n\n  return (\n    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4" style={{ direction: 'rtl' }}>\n      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center shadow-xl max-w-md w-full">\n        <h1 className="text-3xl font-black text-cyan-400 mb-2">${projectName}</h1>\n        <p className="text-slate-400 text-sm mb-6">جاهز الآن للتطوير والكتابة من الهاتف.</p>\n        <input \n          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-center text-cyan-400 focus:outline-none focus:border-cyan-500"\n          value={text} \n          onChange={(e) => setText(e.target.value)} \n        />\n      </div>\n    </div>\n  );\n}`,
  "index.html": `<!DOCTYPE html>\n<html lang="ar">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <script src="https://cdn.tailwindcss.com"></script>\n  <title>Preview</title>\n</head>\n<body>\n  <div id="root"></div>\n</body>\n</html>`
});

// ملفات الطوارئ الافتراضية للمنصة عند أول إقلاع
const FIRST_BOOT_FILES = {
  "App.jsx": `import React from 'react';\nexport default function App() {\n  return <div className="text-white p-8 text-center font-bold">مرحباً بك في المنصة الافتراضية ⚡</div>;\n}`,
  "index.html": `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body><div id="root"></div></body></html>`
};

// ── IndexedDB Engine ─────────────────────────────────────────────────────────
function createIDBStorage() {
  const DB_NAME = 'webide-saas-db';
  const STORE   = 'kv';
  function openDB() {
    return new Promise((res, rej) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
  }
  return {
    getItem: async (key) => {
      try {
        const db = await openDB();
        return new Promise((res) => {
          const tx = db.transaction(STORE, 'readonly');
          const req = tx.objectStore(STORE).get(key);
          req.onsuccess = () => res(req.result);
        });
      } catch { return null; }
    },
    setItem: async (key, value) => {
      try {
        const db = await openDB();
        return new Promise((res) => {
          const tx = db.transaction(STORE, 'readwrite');
          const req = tx.objectStore(STORE).put(value, key);
          req.onsuccess = () => res();
        });
      } catch { localStorage.setItem(key, value); }
    },
    removeItem: async (key) => {
      try {
        const db = await openDB();
        return new Promise((res) => {
          const tx = db.transaction(STORE, 'readwrite');
          const req = tx.objectStore(STORE).delete(key);
          req.onsuccess = () => res();
        });
      } catch { localStorage.removeItem(key); }
    },
  };
}

// ── Store Blueprint ──────────────────────────────────────────────────────────
const useIDEStore = create(
  persist(
    (set, get) => ({
      projects: {},            
      currentProjectId: null,  
      projectName: 'My Project',
      
      files: { ...FIRST_BOOT_FILES },
      activeFile: 'App.jsx',
      openTabs: ['App.jsx'],

      // Layout
      sidebarWidth:   240,
      previewPercent: 44,
      consoleHeight:  180,
      isSidebarOpen:  true,
      isConsoleOpen:  true,
      isPreviewOpen:  true,
      isSettingsOpen:   false,
      expandedFolders:  {},       
      settings: { fontSize: 14, wordWrap: true, autoRefresh: true, theme: 'dark' },
      consoleLogs: [],

      // ═══════════════════════════════════════════════════════════════════════
      // 🚀 لوحة التحكم بالمشاريع المعزولة والتحديث الجذري لشجرة الملفات
      // ═══════════════════════════════════════════════════════════════════════
      
      createNewProject: (name) => {
        const projectId = 'proj_' + Math.random().toString(36).substring(2, 11);
        const freshFiles = createDefaultStarterFiles(name);
        
        const newProject = {
          id: projectId,
          name: name,
          files: freshFiles,
          activeFile: 'App.jsx',
          openTabs: ['App.jsx']
        };

        set(s => ({
          projects: { ...s.projects, [projectId]: newProject },
          currentProjectId: projectId,
          projectName: name,
          files: freshFiles, // مسح الملفات القديمة إجبارياً واستبدالها بملفات المحل
          activeFile: 'App.jsx',
          openTabs: ['App.jsx'],
          consoleLogs: [],
          expandedFolders: {}
        }));

        return projectId;
      },

      switchProject: (projectId) => {
        const project = get().projects[projectId];
        if (project) {
          set({
            currentProjectId: projectId,
            projectName: project.name,
            files: { ...project.files },
            activeFile: project.activeFile || 'App.jsx',
            openTabs: project.openTabs || ['App.jsx'],
            consoleLogs: [],
            expandedFolders: {}
          });
        }
      },

      loadProjectById: (projectId) => {
        const project = get().projects[projectId];
        if (project) {
          set({
            files: { ...project.files },
            projectName: project.name
          });
        }
      },

      generateClientLink: () => {
  const { currentProjectId, projectName, files } = get();
  
  // حزم بيانات المشروع الحالية وتشفيرها داخل الرابط
  const projectPayload = {
    id: currentProjectId || 'dynamic_proj',
    name: projectName,
    files: files
  };

  try {
    // تحويل الكائن إلى نص ثم تشفيره بأسلوب Base64 آمن للروابط
    const jsonString = JSON.stringify(projectPayload);
    const utf8Bytes = new TextEncoder().encode(jsonString);
    const base64 = btoa(String.fromCharCode(...utf8Bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, ''); // تنظيف الحواف

    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?payload=${base64}&preview=true`;
  } catch (e) {
    console.error("فشل تشفير رابط المشروع:", e);
    return `${window.location.origin}${window.location.pathname}?preview=true`;
  }
},

      // ═══════════════════════════════════════════════════════════════════════
      // 🔥 تحديث إجراءات الملفات لتعمل مباشرة داخل الكائن النشط للمشروع الحقيقي
      // ═══════════════════════════════════════════════════════════════════════
      openFile(path) { 
        set({ activeFile: path }); 
      },
      
      updateFile(path, content) {
        set(s => {
          const updatedFiles = { ...s.files, [path]: content };
          const currentId = s.currentProjectId;
          const updatedProjects = { ...s.projects };
          
          if (currentId && updatedProjects[currentId]) {
            updatedProjects[currentId].files = updatedFiles;
          }

          return { 
            files: updatedFiles,
            projects: updatedProjects
          };
        });
      },

      createFile(path) {
        set(s => {
          const updatedFiles = { ...s.files, [path]: `// ملف جديد\nexport default function Component() {\n  return <div>${path}</div>;\n}` };
          const updatedTabs = s.openTabs.includes(path) ? s.openTabs : [...s.openTabs, path];
          const currentId = s.currentProjectId;
          const updatedProjects = { ...s.projects };

          if (currentId && updatedProjects[currentId]) {
            updatedProjects[currentId].files = updatedFiles;
            updatedProjects[currentId].openTabs = updatedTabs;
            updatedProjects[currentId].activeFile = path;
          }

          return {
            files: updatedFiles,
            openTabs: updatedTabs,
            activeFile: path,
            projects: updatedProjects
          };
        });
      },

      deleteFile(path) {
        set(s => {
          const files = { ...s.files };
          Object.keys(files).forEach(k => {
            if (k === path || k.startsWith(path + '/')) delete files[k];
          });
          
          const openTabs = s.openTabs.filter(t => t !== path && !t.startsWith(path + '/'));
          const activeFile = !openTabs.includes(s.activeFile) ? (openTabs[0] ?? 'App.jsx') : s.activeFile;
          
          const currentId = s.currentProjectId;
          const updatedProjects = { ...s.projects };
          if (currentId && updatedProjects[currentId]) {
            updatedProjects[currentId].files = files;
            updatedProjects[currentId].openTabs = openTabs;
            updatedProjects[currentId].activeFile = activeFile;
          }

          return { files, openTabs, activeFile, projects: updatedProjects };
        });
      },

      // بقية التنسيقات المساعدة للمنصة
      updateSetting(key, value) { set(s => ({ settings: { ...s.settings, [key]: value } })); },
      openSettings()  { set({ isSettingsOpen: true  }); },
      closeSettings() { set({ isSettingsOpen: false }); },
      toggleFolder(path) { set(s => ({ expandedFolders: { ...s.expandedFolders, [path]: !s.expandedFolders[path] } })); },
      expandFolder(path) { set(s => ({ expandedFolders: { ...s.expandedFolders, [path]: true } })); },
      addLog(log) { set(s => ({ consoleLogs: [...s.consoleLogs.slice(-400), { ...log, id: Date.now() + Math.random() }] })); },
      clearConsole() { set({ consoleLogs: [] }); },
      setSidebarWidth(w)   { set(s => ({ sidebarWidth: typeof w === 'function' ? w(s.sidebarWidth) : w })); },
      setPreviewPercent(p) { set(s => ({ previewPercent: typeof p === 'function' ? p(s.previewPercent) : p })); },
      setConsoleHeight(h)  { set(s => ({ consoleHeight: typeof h === 'function' ? h(s.consoleHeight) : h })); },
      toggleSidebar()      { set(s => ({ isSidebarOpen: !s.isSidebarOpen })); },
      toggleConsole()      { set(s => ({ isConsoleOpen: !s.isConsoleOpen })); },
      togglePreview()      { set(s => ({ isPreviewOpen: !s.isPreviewOpen })); },
      setProjectName(n)    { set({ projectName: n }); },
    }),
    {
      name: 'webide-saas-v4-storage',
      storage: createJSONStorage(createIDBStorage),
      partialize: s => ({
        projects:         s.projects,
        currentProjectId: s.currentProjectId,
        projectName:      s.projectName,
        files:            s.files,
        openTabs:         s.openTabs,
        activeFile:       s.activeFile,
        settings:         s.settings,
      }),
    }
  )
);

export default useIDEStore;
