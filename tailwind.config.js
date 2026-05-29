/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ide: {
          bg:          '#070d19',
          surface:     '#0d1929',
          elevated:    '#122033',
          border:      '#1e3a5c',
          borderLight: '#2a4d78',
          accent:      '#00d4cc',
          accentDim:   '#00a89f',
          blue:        '#3b8beb',
          text:        '#dde8f5',
          textMuted:   '#6a8fae',
          textDim:     '#3d6080',
          error:       '#f87171',
          warn:        '#fbbf24',
          success:     '#34d399',
          info:        '#60a5fa',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
