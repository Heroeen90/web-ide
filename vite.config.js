import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // <-- تمت إضافة هذا السطر هنا ليجعل المسارات نسبية لتعمل داخل الـ APK
  plugins: [react()],
  optimizeDeps: {
    // Monaco handles its own workers via CDN loader
    exclude: ['@monaco-editor/react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'zustand': ['zustand'],
        },
      },
    },
  },
})
