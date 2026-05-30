/**
 * useIDEStore.js — Central Zustand Store (v3 - Multi-Project Pro)
 * ─────────────────────────────────────────────────────────────────────────────
 * تم الإصلاح الشامل:
 * ✅ الحفاظ على الأسماء القديمة (consoleLogs, files) لعدم انهيار الواجهة والملفات.
 * ✅ دعم كامل لنظام تعدد المشاريع داخل المتصفح (SaaS Mode).
 * ✅ دالة توليد ونسخ روابط مخصصة لكل زبون مستقبلي دون الحاجة لـ GitHub.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_FILES } from '../utils/defaultFiles.js';

// ── IndexedDB fallback storage adapter ───────────────────────────────────────
function createIDBStorage() {
  const DB_NAME = 'webide-projects-db';
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

// ── Store ─────────────────────────────────────────────────────────────────────
const useIDEStore = create(
  persist(
    (set, get) => ({
      // ── System Core & Projects ──────────────────────────────────────────────
      projects: {},            // تخزين المشاريع المتعددة { proj_id: { name, files } }
      currentProjectId: null,  // معرف المشروع الحالي النشط في المحرر
      projectName: 'My Project',
      
      files: { ...DEFAULT_FILES },
      activeFile: 'App.jsx',
      openTabs: ['App.jsx'],

      // ── Layout (مهمة جداً لعدم ظهور شاشة فارغة) ──────────────────────────────
      sidebarWidth:   240,
      previewPercent: 44,
      consoleHeight:  180,
      isSidebarOpen:  true,
      isConsoleOpen:  true,
      isPreviewOpen:  true,

      // ── UI State ────────────────────────────────────────────────────────────
      isSettingsOpen:   false,
      expandedFolders:  {},       
      settings: {
        fontSize: 14,
        wordWrap: true,
        autoRefresh: true,
        theme: 'dark'
      },

      // ── Console (تمت إعادتها لاسمها القديم لتعمل شاشة الـ Console فوراً) ─────
      consoleLogs: [],

      // ═══════════════════════════════════════════════════════════════════════
      // 🚀 إدارة المشاريع المتعددة والروابط السحرية للزبائن
      // ═══════════════════════════════════════════════════════════════════════
      
      // 1. دالة إنشاء مشروع جديد للزبون وحفظه
      createNewProject: (name) => {
        const projectId = 'proj_' + Math.random().toString(36).substring(2, 11);
        const newProject = {
          id: projectId,
          name: name,
          files: { ...DEFAULT_FILES }, // يبدأ بالملفات الافتراضية
          activeFile: 'App.jsx',
          openTabs: ['App.jsx']
        };

        set(s => ({
          projects: { ...s.projects, [projectId]: newProject },
          currentProjectId: projectId,
          projectName: name,
          files: newProject.files,
          activeFile: 'App.jsx',
          openTabs: ['App.jsx'],
          consoleLogs: []
        }));

        return projectId;
      },

      // 2. دالة التنقل بين المشاريع داخل لوحة تحكمك
      switchProject: (projectId) => {
        const project = get().projects[projectId];
        if (project) {
          set({
            currentProjectId: projectId,
            projectName: project.name,
            files: project.files,
            activeFile: project.activeFile || 'App.jsx',
            openTabs: project.openTabs || ['App.jsx'],
            consoleLogs: []
          });
        }
      },

      // 3. دالة جلب المشروع للزبون تلقائياً عند فتح الرابط المخصص
      loadProjectById: (projectId) => {
        const project = get().projects[projectId];
        if (project) {
          set({
            files: project.files,
            projectName: project.name
          });
        }
      },

      // 4. دالة توليد ونسخ الرابط المستقل للزبون الحالي
      generateClientLink: () => {
        const { currentProjectId } = get();
        if (!currentProjectId) {
          // إذا لم يكن هناك مشروع نشط، ننشئ واحداً فوراً باسم المنصة الحالي
          const fallbackId = get().createNewProject(get().projectName);
          const baseUrl = window.location.origin + window.location.pathname;
          return `${baseUrl}?project=${fallbackId}&preview=true`;
        }
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?project=${currentProjectId}&preview=true`;
      },

      // ═══════════════════════════════════════════════════════════════════════
      // File Actions (تحديث لحفظ التعديلات داخل قائمة المشاريع أيضاً تلقائياً)
      // ═══════════════════════════════════════════════════════════════════════
      openFile(path) { set({ activeFile: path }); },
      
      updateFile(path, content) {
        set(s => {
          const updatedFiles = { ...s.files, [path]: content };
          
          // حفظ التعديل في قائمة المشاريع المتعددة أيضاً لضمان عدم ضياع كود الزبون
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

      deleteFile(path) {
        set(s => {
          const files = { ...s.files };
          Object.keys(files).forEach(k => {
            if (k === path || k.startsWith(path + '/')) delete files[k];
          });
          const openTabs = s.openTabs.filter(t => t !== path && !t.startsWith(path + '/'));
          const activeFile = !openTabs.includes(s.activeFile) ? (openTabs[0] ?? null) : s.activeFile;
          
          const currentId = s.currentProjectId;
          const updatedProjects = { ...s.projects };
          if (currentId && updatedProjects[currentId]) {
            updatedProjects[currentId].files = files;
          }

          return { files, openTabs, activeFile, projects: updatedProjects };
        });
      },

      // ═══════════════════════════════════════════════════════════════════════
      // بقية الدوال القديمة المتوافقة مع الـ UI لمنع ظهور شاشة فارغة
      // ═══════════════════════════════════════════════════════════════════════
      updateSetting(key, value) { set(s => ({ settings: { ...s.settings, [key]: value } })); },
      openSettings()  { set({ isSettingsOpen: true  }); },
      closeSettings() { set({ isSettingsOpen: false }); },
      toggleFolder(path) { set(s => ({ expandedFolders: { ...s.expandedFolders, [path]: !s.expandedFolders[path] } })); },
      expandFolder(path) { set(s => ({ expandedFolders: { ...s.expandedFolders, [path]: true } })); },
      
      addLog(log) {
        set(s => ({
          consoleLogs: [...s.consoleLogs.slice(-400), { ...log, id: Date.now() + Math.random() }]
        }));
      },
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
      name: 'webide-saas-v3-storage',
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

