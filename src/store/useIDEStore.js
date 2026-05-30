/**
 * useIDEStore.js — Central Zustand Store (v2)
 * ─────────────────────────────────────────────────────────────────────────────
 * الجديد في هذه النسخة:
 *   ✅ دعم مجلدات (مسارات متعددة في keys)
 *   ✅ Settings panel (theme, font, editor options)
 *   ✅ Upload files / ZIP
 *   ✅ Export ZIP
 *   ✅ IndexedDB fallback للمشاريع الكبيرة
 *   ✅ إصلاح openTabs للمسارات الطويلة
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_FILES } from '../utils/defaultFiles.js';
import { fileLang, fileTemplate, pathBasename, pathDirname, pathJoin } from '../utils/fileSystem.js';
import { exportZIP } from '../utils/zipHandler.js';

// ── IndexedDB storage adapter ─────────────────────────────────────────────────
// يستخدم IDB لتجنب حد 5MB في localStorage
function createIDBStorage() {
  const DB_NAME = 'webide-db';
  const STORE   = 'kv';

  function openDB() {
    return new Promise((res, rej) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
  }

  async function idbGet(key) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx  = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
  }

  async function idbSet(key, value) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx  = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).put(value, key);
      req.onsuccess = () => res();
      req.onerror   = () => rej(req.error);
    });
  }

  async function idbDel(key) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx  = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).delete(key);
      req.onsuccess = () => res();
      req.onerror   = () => rej(req.error);
    });
  }

  return {
    getItem:    async (key)        => { try { return await idbGet(key); } catch { return null; } },
    setItem:    async (key, value) => { try { await idbSet(key, value); } catch { localStorage.setItem(key, value); } },
    removeItem: async (key)        => { try { await idbDel(key); } catch { localStorage.removeItem(key); } },
  };
}

// ── Default settings ──────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  fontSize:      14,
  wordWrap:      true,
  tabSize:       2,
  autoRefresh:   true,
  autoSave:      true,
  minimap:       false,
  lineNumbers:   true,
  theme:         'dark',          // 'dark' | 'light'
  previewTheme:  'responsive',    // 'mobile' | 'tablet' | 'desktop' | 'responsive'
};

// ── Store ─────────────────────────────────────────────────────────────────────
const useIDEStore = create(
  persist(
    (set, get) => ({
      // ── File System ─────────────────────────────────────────────────────────
      files:      { ...DEFAULT_FILES },
      activeFile: 'App.jsx',
      openTabs:   ['App.jsx'],

      // ── Layout ──────────────────────────────────────────────────────────────
      sidebarWidth:   240,
      previewPercent: 44,
      consoleHeight:  180,
      isSidebarOpen:  true,
      isConsoleOpen:  true,
      isPreviewOpen:  true,

      // ── UI State ────────────────────────────────────────────────────────────
      isSettingsOpen:   false,
      isUploadingZIP:   false,
      expandedFolders:  {},       // { 'components': true, 'utils': false }

      // ── Console ─────────────────────────────────────────────────────────────
      consoleLogs: [],

      // ── Project ─────────────────────────────────────────────────────────────
      projectName: 'My Project',

      // ── Settings ────────────────────────────────────────────────────────────
      settings: { ...DEFAULT_SETTINGS },

      // ═══════════════════════════════════════════════════════════════════════
      // Settings
      // ═══════════════════════════════════════════════════════════════════════
      updateSetting(key, value) {
        set(s => ({ settings: { ...s.settings, [key]: value } }));
      },
      resetSettings() {
        set({ settings: { ...DEFAULT_SETTINGS } });
      },
      openSettings()  { set({ isSettingsOpen: true  }); },
      closeSettings() { set({ isSettingsOpen: false }); },

      // ═══════════════════════════════════════════════════════════════════════
      // File Actions
      // ═══════════════════════════════════════════════════════════════════════

      openFile(path) {
        set(s => ({
          openTabs:   s.openTabs.includes(path) ? s.openTabs : [...s.openTabs, path],
          activeFile: path,
        }));
      },

      closeTab(path) {
        set(s => {
          const tabs   = s.openTabs.filter(t => t !== path);
          const idx    = s.openTabs.indexOf(path);
          const active = s.activeFile === path
            ? (tabs[Math.max(0, idx - 1)] ?? tabs[0] ?? null)
            : s.activeFile;
          return { openTabs: tabs, activeFile: active };
        });
      },

      updateFile(path, content) {
        set(s => ({ files: { ...s.files, [path]: content } }));
      },

      createFile(path) {
        const { files } = get();
        if (files[path] !== undefined) {
          get().openFile(path);
          return;
        }
        const content = fileTemplate(path);
        set(s => ({ files: { ...s.files, [path]: content } }));
        get().openFile(path);
        // Auto-expand parent folder
        const dir = pathDirname(path);
        if (dir) get().expandFolder(dir);
      },

      createFolder(path) {
        // Folders are virtual — just expand them
        get().expandFolder(path);
      },

            deleteFile(path) {
        set(s => {
          const files = { ...s.files };
          
          // 1. حذف الملف أو المجلد وكل محتوياته من قائمة الملفات
          Object.keys(files).forEach(k => {
            if (k === path || k.startsWith(path + '/')) delete files[k];
          });

          // 2. تنظيف المجلد المحذوف وأي مجلدات فرعية بداخله من قائمة expandedFolders
          const expandedFolders = { ...s.expandedFolders };
          delete expandedFolders[path];
          Object.keys(expandedFolders).forEach(k => {
            if (k.startsWith(path + '/')) delete expandedFolders[k];
          });

          // 3. تحديث التبويبات المفتوحة
          const openTabs   = s.openTabs.filter(t => t !== path && !t.startsWith(path + '/'));
          const activeFile = !openTabs.includes(s.activeFile) ? (openTabs[0] ?? null) : s.activeFile;

          return { 
            files, 
            expandedFolders, // تمت إضافتها للتنظيف الافتراضي
            openTabs, 
            activeFile 
          };
        });
      },


      renameFile(oldPath, newPath) {
        const { files } = get();
        if (!Object.prototype.hasOwnProperty.call(files, oldPath)) return;
        if (files[newPath] !== undefined) return;

        set(s => {
          const f = { ...s.files };
          // Handle folder rename — rename all children
          const isFolder = Object.keys(f).some(k => k.startsWith(oldPath + '/'));
          if (isFolder) {
            Object.keys(f).forEach(k => {
              if (k.startsWith(oldPath + '/')) {
                f[k.replace(oldPath, newPath)] = f[k];
                delete f[k];
              }
            });
          } else {
            f[newPath] = f[oldPath];
            delete f[oldPath];
          }
          return {
            files:      f,
            openTabs:   s.openTabs.map(t => t === oldPath ? newPath : t.startsWith(oldPath + '/') ? t.replace(oldPath, newPath) : t),
            activeFile: s.activeFile === oldPath ? newPath : s.activeFile,
          };
        });
      },

      duplicateFile(path) {
        const { files } = get();
        const content = files[path];
        if (content === undefined) return;
        const ext  = path.includes('.') ? '.' + path.split('.').pop() : '';
        const base = ext ? path.slice(0, -ext.length) : path;
        let newPath = `${base}-copy${ext}`;
        let i = 2;
        while (files[newPath] !== undefined) newPath = `${base}-copy${i++}${ext}`;
        set(s => ({ files: { ...s.files, [newPath]: content } }));
        get().openFile(newPath);
      },

      // ── Folder expand/collapse ─────────────────────────────────────────────
      toggleFolder(path) {
        set(s => ({
          expandedFolders: {
            ...s.expandedFolders,
            [path]: !s.expandedFolders[path],
          },
        }));
      },
      expandFolder(path) {
        set(s => ({ expandedFolders: { ...s.expandedFolders, [path]: true } }));
      },
      collapseAll() {
        set({ expandedFolders: {} });
      },

      // ── Upload files ────────────────────────────────────────────────────────
      addFiles(newFiles) {
        set(s => ({
          files: { ...s.files, ...newFiles },
        }));
        // Open first uploaded file
        const first = Object.keys(newFiles)[0];
        if (first) get().openFile(first);
      },

      // ═══════════════════════════════════════════════════════════════════════
      // Console
      // ═══════════════════════════════════════════════════════════════════════
      addLog(log) {
        set(s => ({
          consoleLogs: [
            ...s.consoleLogs.slice(-500),
            { ...log, id: Date.now() + Math.random() },
          ],
        }));
      },
      clearConsole() { set({ consoleLogs: [] }); },

      // ═══════════════════════════════════════════════════════════════════════
      // Layout
      // ═══════════════════════════════════════════════════════════════════════
      setSidebarWidth(w)   { set({ sidebarWidth:   Math.max(160, Math.min(480, w)) }); },
      setPreviewPercent(p) { set({ previewPercent: Math.max(20,  Math.min(75,  p)) }); },
      setConsoleHeight(h)  { set({ consoleHeight:  Math.max(80,  Math.min(600, h)) }); },
      toggleSidebar()      { set(s => ({ isSidebarOpen: !s.isSidebarOpen })); },
      toggleConsole()      { set(s => ({ isConsoleOpen: !s.isConsoleOpen })); },
      togglePreview()      { set(s => ({ isPreviewOpen: !s.isPreviewOpen })); },

      // ═══════════════════════════════════════════════════════════════════════
      // Project
      // ═══════════════════════════════════════════════════════════════════════
      setProjectName(n) { set({ projectName: n }); },

      loadProject(data) {
        const first = Object.keys(data.files)[0] ?? 'App.jsx';
        set({
          files:           data.files,
          projectName:     data.name ?? 'Imported Project',
          activeFile:      first,
          openTabs:        [first],
          consoleLogs:     [],
          expandedFolders: {},
        });
      },

      resetProject() {
        set({
          files:           { ...DEFAULT_FILES },
          activeFile:      'App.jsx',
          openTabs:        ['App.jsx'],
          consoleLogs:     [],
          projectName:     'My Project',
          expandedFolders: {},
        });
      },

      async exportProjectZIP() {
        const { files, projectName } = get();
        await exportZIP(projectName, files);
      },

      exportProjectJSON() {
        const { files, projectName } = get();
        const data = JSON.stringify({ name: projectName, files }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${projectName.replace(/\s+/g, '-')}.webide.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
    }),

    {
      name:    'webide-v2',
      storage: createJSONStorage(createIDBStorage),
      partialize: s => ({
        files:           s.files,
        projectName:     s.projectName,
        openTabs:        s.openTabs,
        activeFile:      s.activeFile,
        settings:        s.settings,
        expandedFolders: s.expandedFolders,
      }),
    }
  )
);

export default useIDEStore;

