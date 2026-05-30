import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// الأكواد الافتراضية لأي مشروع جديد يتم إنشاؤه
const defaultStarterFiles = {
  "App.jsx": `import React from 'react';\nexport default function App() {\n  return (\n    <div className="p-8 text-center text-white">\n      <h1 className="text-2xl font-bold">مشروع جديد زيرو 🚀</h1>\n      <p className="text-slate-400 mt-2">ابدأ بكتابة كود زبونك هنا.</p>\n    </div>\n  );\n}`,
  "index.html": `<!DOCTYPE html>\n<html>\n<head><script src="https://cdn.tailwindcss.com"></script></head>\n<body><div id="root"></div></body>\n</html>`
};

const useIDEStore = create(
  persist(
    (set, get) => ({
      // قائمة المشاريع المحفوظة داخل المنصة
      projects: {}, 
      currentProjectId: null,
      projectName: "مشروع افتراضي",
      files: defaultStarterFiles,
      
      // حالات فتح وإغلاق النوافذ في الـ IDE
      isSidebarOpen: true,
      sidebarWidth: 260,
      isConsoleOpen: false,
      consoleHeight: 150,
      isPreviewOpen: true,
      previewPercent: 50,
      isSettingsOpen: false,
      logs: [],
      settings: { autoRefresh: true },

      // 1️⃣ دالة إنشاء مشروع جديد تماماً وتوليد ID فريد له
      createNewProject: (name) => {
        const projectId = 'proj_' + Math.random().toString(36).substring(2, 11);
        const newProject = {
          id: projectId,
          name: name,
          files: { ...defaultStarterFiles },
          createdAt: Date.now()
        };
        
        set((state) => ({
          projects: { ...state.projects, [projectId]: newProject },
          currentProjectId: projectId,
          projectName: name,
          files: newProject.files
        }));
        
        return projectId;
      },

      // 2️⃣ دالة التنقل والتبديل بين المشاريع داخل المنصة
      switchProject: (projectId) => {
        const project = get().projects[projectId];
        if (project) {
          set({
            currentProjectId: projectId,
            projectName: project.name,
            files: project.files
          });
        }
      },

      // 3️⃣ دالة حفظ التعديلات الحالية فوراً في كائن المشروع المستهدف
      saveCurrentFiles: (updatedFiles) => {
        const { currentProjectId, projects } = get();
        set({ files: updatedFiles });
        
        if (currentProjectId && projects[currentProjectId]) {
          const updatedProject = { ...projects[currentProjectId], files: updatedFiles };
          set({
            projects: { ...projects, [currentProjectId]: updatedProject }
          });
        }
      },

      // 4️⃣ دالة ذكية تستدعى عند فتح رابط المعاينة الخاص بالزبون لجلب كوده الشخصي
      loadProjectById: (projectId) => {
        const project = get().projects[projectId];
        if (project) {
          set({ files: project.files });
        }
      },

      // 5️⃣ دالة توليد ونسخ رابط الزبون المخصص للمشروع الحالي
      generateClientLink: () => {
        const { currentProjectId } = get();
        if (!currentProjectId) return "يرجى إنشاء مشروع أولاً";
        
        const baseUrl = window.location.origin + window.location.pathname;
        // توليد الرابط الخارق والذكي للزبون بدون الـ IDE
        return `${baseUrl}?project=${currentProjectId}&preview=true`;
      },

      // بقية الدوال المساعدة للمنصة...
      updateSetting: (key, val) => set((state) => ({ settings: { ...state.settings, [key]: val } })),
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
      clearConsole: () => set({ logs: [] }),
      addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
      setSidebarWidth: (fn) => set((state) => ({ sidebarWidth: typeof fn === 'function' ? fn(state.sidebarWidth) : fn })),
      setConsoleHeight: (fn) => set((state) => ({ consoleHeight: typeof fn === 'function' ? fn(state.consoleHeight) : fn })),
      setPreviewPercent: (fn) => set((state) => ({ previewPercent: typeof fn === 'function' ? fn(state.previewPercent) : fn })),
    }),
    {
      name: 'super-programmer-ide-storage', // مفتاح الحفظ الثابت في المتصفح لمشاريعك
      partialize: (state) => ({ projects: state.projects, currentProjectId: state.currentProjectId }),
    }
  )
);

export default useIDEStore;
