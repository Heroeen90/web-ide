/**
 * fileSystem.js — Virtual File System Utilities
 * ─────────────────────────────────────────────────────────────────────────────
 * الملفات تُخزَّن في map بسيط { 'path/to/file.jsx': 'content' }
 * هذا الملف يوفر:
 *   - بناء شجرة المجلدات من المسارات المسطّحة
 *   - دوال تعامل مع المسارات (join, dirname, basename)
 *   - ترتيب وتصنيف الملفات
 */

// ── Path utilities ────────────────────────────────────────────────────────────

export function pathJoin(...parts) {
  return parts
    .map((p, i) => i === 0 ? p.replace(/\/$/, '') : p.replace(/^\/|\/$/g, ''))
    .filter(Boolean)
    .join('/');
}

export function pathDirname(p) {
  const parts = p.split('/');
  parts.pop();
  return parts.join('/') || '';
}

export function pathBasename(p) {
  return p.split('/').pop() || p;
}

export function pathExtname(p) {
  const base = pathBasename(p);
  const idx = base.lastIndexOf('.');
  return idx > 0 ? base.slice(idx + 1).toLowerCase() : '';
}

export function pathWithoutExt(p) {
  const base = pathBasename(p);
  const idx = base.lastIndexOf('.');
  return idx > 0 ? base.slice(0, idx) : base;
}

/** Resolve a relative import from a source file's directory */
export function resolveImport(importPath, fromFile) {
  if (!importPath.startsWith('.')) return importPath; // external package
  const dir = pathDirname(fromFile);
  const resolved = dir ? pathJoin(dir, importPath) : importPath.replace(/^\.\//, '');
  // Normalize .. segments
  const parts = resolved.split('/');
  const stack = [];
  for (const p of parts) {
    if (p === '..') stack.pop();
    else if (p !== '.') stack.push(p);
  }
  return stack.join('/');
}

// ── Tree Builder ─────────────────────────────────────────────────────────────

/**
 * Build a nested tree structure from a flat file map.
 *
 * Input:  { 'App.jsx': '...', 'components/Button.jsx': '...', 'utils/helpers.js': '...' }
 * Output: TreeNode[]
 *
 * TreeNode = {
 *   name:      string,       // display name
 *   path:      string,       // full path key
 *   isFolder:  boolean,
 *   children?: TreeNode[],   // for folders
 * }
 */
export function buildFileTree(files) {
  const root = { name: 'root', path: '', isFolder: true, children: {} };

  for (const filePath of Object.keys(files).sort()) {
    const parts = filePath.split('/');
    let node = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const folderPath = parts.slice(0, i + 1).join('/');
      if (!node.children[part]) {
        node.children[part] = {
          name:     part,
          path:     folderPath,
          isFolder: true,
          children: {},
        };
      }
      node = node.children[part];
    }

    const filename = parts[parts.length - 1];
    node.children[filename] = {
      name:     filename,
      path:     filePath,
      isFolder: false,
    };
  }

  return sortTree(Object.values(root.children));
}

function sortTree(nodes) {
  return nodes
    .map(n => n.isFolder ? { ...n, children: sortTree(Object.values(n.children)) } : n)
    .sort((a, b) => {
      // folders first, then by name
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

// ── File categorisation ───────────────────────────────────────────────────────

export const FILE_ICONS = {
  jsx:  '⚛', tsx: '⚛',
  js:   '📜', ts:  '📘',
  css:  '🎨', scss:'🎨',
  html: '🌐',
  json: '📋',
  md:   '📝',
  svg:  '🖼',
  png:  '🖼', jpg: '🖼', gif: '🖼',
  txt:  '📄',
  env:  '🔑',
};

export const FILE_LANG = {
  jsx:  'javascript', tsx:  'typescript',
  js:   'javascript', ts:   'typescript',
  css:  'css',        scss: 'scss',
  html: 'html',
  json: 'json',
  md:   'markdown',
  svg:  'xml',
};

export const LANG_COLOR = {
  javascript: '#f7df1e',
  typescript: '#3178c6',
  css:        '#38bdf8',
  html:       '#e06c33',
  json:       '#9ca3af',
  markdown:   '#7dd3fc',
};

export function fileIcon(filename) {
  return FILE_ICONS[pathExtname(filename)] ?? '📄';
}

export function fileLang(filename) {
  return FILE_LANG[pathExtname(filename)] ?? 'plaintext';
}

// ── Validation ────────────────────────────────────────────────────────────────

const INVALID_CHARS = /[<>:"|?*\x00-\x1f]/;

export function isValidFilename(name) {
  return name.length > 0 && name.length < 255 && !INVALID_CHARS.test(name);
}

// ── File templates ────────────────────────────────────────────────────────────

export function fileTemplate(filename) {
  const ext  = pathExtname(filename);
  const base = pathWithoutExt(pathBasename(filename));
  const Name = base.charAt(0).toUpperCase() + base.slice(1);

  const T = {
    jsx:  `import React from 'react';\n\nexport default function ${Name}() {\n  return (\n    <div className="p-4">\n      <h1 className="text-2xl font-bold">${Name}</h1>\n    </div>\n  );\n}\n`,
    tsx:  `import React from 'react';\n\ninterface Props {}\n\nexport default function ${Name}({}: Props) {\n  return (\n    <div className="p-4">\n      <h1 className="text-2xl font-bold">${Name}</h1>\n    </div>\n  );\n}\n`,
    js:   `// ${filename}\n\nexport function ${base}() {\n  // ...\n}\n`,
    ts:   `// ${filename}\n\nexport function ${base}(): void {\n  // ...\n}\n`,
    css:  `/* ${filename} */\n\n`,
    html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>${Name}</title>\n</head>\n<body>\n  <h1>${Name}</h1>\n</body>\n</html>\n`,
    json: `{\n  "name": "${base.toLowerCase()}"\n}\n`,
    md:   `# ${Name}\n\n`,
  };

  return T[ext] ?? `// ${filename}\n`;
}
