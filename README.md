# ⚡ WebIDE — Professional Browser-Based Code Editor

A fully-featured browser IDE inspired by Claude Artifacts and StackBlitz.  
Write React/JSX code, see a live preview instantly — no backend required.

![WebIDE Screenshot](https://via.placeholder.com/1200x600/070d19/00d4cc?text=WebIDE+Screenshot)

---

## ✨ Features

| Feature | Details |
|---------|---------|
| **Monaco Editor** | Full VS Code editor experience with syntax highlighting, IntelliSense, bracket matching |
| **Live JSX/TSX Preview** | In-browser Babel transpilation — no server needed |
| **TailwindCSS** | Auto-loaded in every preview via CDN Play |
| **Multi-file support** | App.jsx · style.css · index.html · package.json + create any file |
| **Virtual File System** | In-memory FS, persisted to `localStorage` between sessions |
| **Console Panel** | Captures `console.log/warn/error` from the iframe with filtering |
| **Resizable panels** | Drag sidebar, preview, and console to your preferred size |
| **Export / Import** | Save your project as `.webide.json` and reload it later |
| **Auto-refresh** | Debounced 700 ms live reload as you type |
| **Dark theme** | Custom midnight-blue palette with electric-teal accents |

---

## 🚀 Quick Start (Local)

### Prerequisites
- **Node.js** ≥ 18  
- **npm** ≥ 9 (or pnpm / yarn)

### 1 — Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/web-ide.git
cd web-ide
npm install
```

### 2 — Start the dev server

```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

> **Internet required for preview**: the live preview loads React 18, ReactDOM and  
> TailwindCSS from CDN. Babel standalone is also fetched once from unpkg.  
> All resources are cached by the browser after first load.

---

## 📁 Project Structure

```
web-ide/
├── index.html                  ← App shell; loads @babel/standalone via CDN
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── src/
    ├── main.jsx                ← React bootstrap
    ├── App.jsx                 ← Main IDE layout (resizable panels)
    ├── index.css               ← Tailwind + CSS design tokens
    │
    ├── store/
    │   └── useIDEStore.js      ← Zustand store (files, UI state, console)
    │
    ├── utils/
    │   ├── defaultFiles.js     ← Starter templates
    │   ├── transpiler.js       ← Babel wrapper (JSX → CommonJS)
    │   └── htmlGenerator.js    ← Builds full iframe HTML from user files
    │
    └── components/
        ├── Toolbar/            ← Top bar (run, export, layout toggles)
        ├── FileExplorer/       ← Left sidebar (create / rename / delete)
        ├── TabBar/             ← Open file tabs
        ├── Editor/             ← Monaco Editor wrapper + custom theme
        ├── Preview/            ← Sandboxed iframe live preview
        ├── ConsolePanel/       ← Captured console output
        └── StatusBar/          ← Bottom status bar
```

---

## 🔧 How It Works

```
User types JSX
      │
      ▼
 useIDEStore (Zustand)
 files["App.jsx"] updated
      │
      ▼ (debounced 700 ms)
 generatePreviewHTML(files)
      │
      ├─ transpileFile(code, "App.jsx")
      │     └─ window.Babel.transform()  ← @babel/standalone CDN
      │        presets: [react, typescript?]
      │        plugins: [transform-modules-commonjs]
      │
      ├─ Build __define() module registry
      │
      └─ Inject into iframe srcDoc:
            • React 18 UMD from unpkg
            • ReactDOM 18 UMD from unpkg
            • TailwindCSS CDN
            • User CSS
            • CJS runtime (__require / __define)
            • All transpiled user modules
            • Auto-mount: ReactDOM.createRoot(App)
            • Console interception → postMessage → ConsolePanel
```

---

## 🛠️ Supported File Types

| Extension | Language | Notes |
|-----------|----------|-------|
| `.jsx`    | JavaScript + JSX | React components |
| `.tsx`    | TypeScript + JSX | Typed React components |
| `.js`     | JavaScript | Utilities, helpers |
| `.ts`     | TypeScript | Typed utilities |
| `.css`    | CSS | Auto-injected into preview `<style>` |
| `.html`   | HTML | Used as preview shell |
| `.json`   | JSON | Config files (not executed) |

### External packages
The following packages are automatically resolved in preview:

| Import | Resolves to |
|--------|-------------|
| `react` | `window.React` (UMD) |
| `react-dom` | `window.ReactDOM` (UMD) |
| `react-dom/client` | `{ createRoot }` from `window.ReactDOM` |

For other packages (e.g. `framer-motion`, `axios`), add them as `<script>` tags  
in `index.html` inside the virtual file system, or use esm.sh imports.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/⌘ + S` | Format document |
| `Ctrl/⌘ + /` | Toggle line comment |
| `Ctrl/⌘ + Enter` | *(assign in Toolbar)* |
| `Ctrl/⌘ + Z` | Undo |
| `Ctrl/⌘ + Shift + Z` | Redo |
| `Alt + Shift + F` | Format document |
| `Ctrl + Space` | Trigger IntelliSense |

---

## 🌐 Deploy to Vercel

### One-click deploy

```bash
npm i -g vercel
vercel
```

Follow the prompts. Vercel auto-detects Vite.

### Manual (GitHub → Vercel)

1. Push to GitHub  
2. Go to [vercel.com/new](https://vercel.com/new)  
3. Import your repo  
4. Framework preset: **Vite**  
5. Build command: `npm run build`  
6. Output directory: `dist`  
7. Click **Deploy**

### Deploy to Netlify

```bash
npm run build
# drag-and-drop the dist/ folder to netlify.com/drop
```

Or connect your GitHub repo and set:
- Build command: `npm run build`
- Publish directory: `dist`

### Deploy to GitHub Pages

```bash
# vite.config.js: add base: '/web-ide/'
npm run build
npx gh-pages -d dist
```

---

## 📤 Push to GitHub

```bash
cd web-ide
git init
git add .
git commit -m "feat: initial WebIDE commit"

# Create repo on github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/web-ide.git
git branch -M main
git push -u origin main
```

---

## 🔌 Future Enhancements

- [ ] npm package installation via esm.sh
- [ ] Multiple project tabs
- [ ] Shareable URLs (encode project in URL hash)
- [ ] Light theme toggle
- [ ] Vue.js / Svelte support
- [ ] Split editor (side-by-side files)
- [ ] Git integration
- [ ] AI code assistant (Claude API)
- [ ] Terminal panel (via WebContainer API)
- [ ] Offline PWA support

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Editor | [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react) |
| Transpiler | [@babel/standalone](https://babeljs.io/docs/babel-standalone) (CDN) |
| State | [Zustand](https://zustand-demo.pmnd.rs/) + localStorage |
| Styling (IDE) | [TailwindCSS](https://tailwindcss.com/) |
| Styling (Preview) | TailwindCSS CDN Play |
| Build | [Vite](https://vitejs.dev/) |
| Runtime | React 18 UMD (CDN) |

---

## 📄 License

MIT © 2024 — Feel free to use, modify, and distribute.
