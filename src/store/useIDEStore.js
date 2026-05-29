/**
 * useIDEStore.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Central Zustand store for the entire IDE.
 * Files, UI layout, console logs, and project metadata all live here.
 * The file system and project name are persisted to localStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_FILES, FILE_LANGUAGE_MAP, FILE_TEMPLATES } from '../utils/defaultFiles.js';

// ─── Helper ───────────────────────────────────────────────────────────────────
function getExt(filename) {
  return filename.split('.').pop().toLowerCase();
}

function getBaseName(filename) {
  const parts = filename.split('.');
  parts.pop();
  return parts.join('.');
}

// ─── Store ────────────────────────────────────────────────────────────────────
const useIDEStore = create(
  persist(
    (set, get) => ({
      // ── File System ─────────────────────────────────────────────────────────
      files:      { ...DEFAULT_FILES },
      activeFile: 'App.jsx',
      openTabs:   ['App.jsx'],

      // ── Layout & UI State ───────────────────────────────────────────────────
      sidebarWidth:    240,
      previewPercent:  44,   // % of the content area (editor + preview)
      consoleHeight:   180,
      isSidebarOpen:   true,
      isConsoleOpen:   true,
      isPreviewOpen:   true,
      autoRefresh:     true,
      wordWrap:        true,
      fontSize:        14,

      // ── Console Logs ─────────────────────────────────────────────────────────
      consoleLogs: [],

      // ── Project ──────────────────────────────────────────────────────────────
      projectName: 'My Project',

      // ═══════════════════════════════════════════════════════════════════════
      // File Actions
      // ═══════════════════════════════════════════════════════════════════════

      /** Open a file (add tab if not already open) and activate it */
      openFile(filename) {
        set(state => {
          const tabs = state.openTabs.includes(filename)
            ? state.openTabs
            : [...state.openTabs, filename];
          return { openTabs: tabs, activeFile: filename };
        });
      },

      /** Close a tab; switch to adjacent tab */
      closeTab(filename) {
        set(state => {
          const tabs = state.openTabs.filter(t => t !== filename);
          let active = state.activeFile;
          if (active === filename) {
            const idx = state.openTabs.indexOf(filename);
            active = tabs[Math.max(0, idx - 1)] ?? tabs[0] ?? null;
          }
          return { openTabs: tabs, activeFile: active };
        });
      },

      /** Update file content (triggers auto-refresh in App via subscription) */
      updateFile(filename, content) {
        set(state => ({ files: { ...state.files, [filename]: content } }));
      },

      /** Create a new file with an appropriate template */
      createFile(filename) {
        const { files } = get();
        if (files[filename] !== undefined) return; // already exists

        const ext  = getExt(filename);
        const base = getBaseName(filename);
        const template = FILE_TEMPLATES[ext];
        const content  = template ? template(base) : `// ${filename}\n`;

        set(state => ({ files: { ...state.files, [filename]: content } }));
        get().openFile(filename);
      },

      /** Delete a file and close its tab */
      deleteFile(filename) {
        set(state => {
          const files = { ...state.files };
          delete files[filename];
          const openTabs  = state.openTabs.filter(t => t !== filename);
          const activeFile = state.activeFile === filename
            ? (openTabs[0] ?? null)
            : state.activeFile;
          return { files, openTabs, activeFile };
        });
      },

      /** Rename a file (updates tabs & active pointer) */
      renameFile(oldName, newName) {
        const { files } = get();
        if (!files[oldName] || files[newName] !== undefined) return;

        set(state => {
          const f = { ...state.files };
          f[newName] = f[oldName];
          delete f[oldName];
          return {
            files:      f,
            openTabs:   state.openTabs.map(t => (t === oldName ? newName : t)),
            activeFile: state.activeFile === oldName ? newName : state.activeFile,
          };
        });
      },

      /** Get Monaco language for the active file */
      getActiveLanguage() {
        const { activeFile } = get();
        if (!activeFile) return 'plaintext';
        return FILE_LANGUAGE_MAP[getExt(activeFile)] ?? 'plaintext';
      },

      // ═══════════════════════════════════════════════════════════════════════
      // Console Actions
      // ═══════════════════════════════════════════════════════════════════════

      addLog(log) {
        set(state => ({
          consoleLogs: [
            ...state.consoleLogs.slice(-300),    // keep last 300
            { ...log, id: Date.now() + Math.random() },
          ],
        }));
      },

      clearConsole() {
        set({ consoleLogs: [] });
      },

      // ═══════════════════════════════════════════════════════════════════════
      // Layout / UI Toggles
      // ═══════════════════════════════════════════════════════════════════════

      setSidebarWidth(w)    { set({ sidebarWidth: Math.max(160, Math.min(400, w)) }); },
      setPreviewPercent(p)  { set({ previewPercent: Math.max(20, Math.min(70, p)) }); },
      setConsoleHeight(h)   { set({ consoleHeight: Math.max(80, Math.min(500, h)) }); },

      toggleSidebar()     { set(s => ({ isSidebarOpen:  !s.isSidebarOpen  })); },
      toggleConsole()     { set(s => ({ isConsoleOpen:   !s.isConsoleOpen   })); },
      togglePreview()     { set(s => ({ isPreviewOpen:   !s.isPreviewOpen   })); },
      toggleAutoRefresh() { set(s => ({ autoRefresh:     !s.autoRefresh     })); },
      toggleWordWrap()    { set(s => ({ wordWrap:        !s.wordWrap        })); },
      setFontSize(n)      { set({ fontSize: Math.max(10, Math.min(24, n)) }); },
      setProjectName(n)   { set({ projectName: n }); },

      // ═══════════════════════════════════════════════════════════════════════
      // Project Management
      // ═══════════════════════════════════════════════════════════════════════

      /** Load an imported project (JSON format) */
      loadProject(data) {
        const first = Object.keys(data.files)[0] ?? 'App.jsx';
        set({
          files:       data.files,
          projectName: data.name ?? 'Imported Project',
          activeFile:  first,
          openTabs:    [first],
          consoleLogs: [],
        });
      },

      /** Reset to the default starter project */
      resetProject() {
        set({
          files:       { ...DEFAULT_FILES },
          activeFile:  'App.jsx',
          openTabs:    ['App.jsx'],
          consoleLogs: [],
          projectName: 'My Project',
        });
      },

      /** Export current project as a JSON blob download */
      exportProject() {
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

    // ── Persistence config ──────────────────────────────────────────────────
    {
      name:    'webide-project-v1',
      storage: createJSONStorage(() => localStorage),
      // Only persist files and project meta; UI state is ephemeral
      partialize: state => ({
        files:       state.files,
        projectName: state.projectName,
        openTabs:    state.openTabs,
        activeFile:  state.activeFile,
        fontSize:    state.fontSize,
        wordWrap:    state.wordWrap,
        autoRefresh: state.autoRefresh,
      }),
    }
  )
);

export default useIDEStore;
