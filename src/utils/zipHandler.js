/**
 * zipHandler.js — ZIP Import & Export
 * ─────────────────────────────────────────────────────────────────────────────
 * يستخدم مكتبة JSZip لاستيراد وتصدير مشاريع ZIP.
 *
 * Import: يقرأ ملف ZIP ويُعيد { name, files } جاهز للـ store.
 * Export: يأخذ مجموعة الملفات ويُنشئ ZIP للتنزيل.
 */

import JSZip from 'jszip';

// ── امتدادات النصوص فقط (نتجاهل الصور والبينارات) ────────────────────────────
const TEXT_EXTS = new Set([
  'js','jsx','ts','tsx','css','scss','less',
  'html','htm','json','md','txt','svg','env',
  'yaml','yml','toml','xml','gitignore','eslintrc',
  'prettierrc','babelrc','nvmrc',
]);

function isTextFile(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return TEXT_EXTS.has(ext) || !filename.includes('.');
}

// ── استبعاد المجلدات غير الضرورية ────────────────────────────────────────────
const IGNORE_PREFIXES = [
  'node_modules/', '.git/', 'dist/', 'build/', '.next/',
  '.cache/', '__pycache__/', '.DS_Store',
];

function shouldIgnore(path) {
  return IGNORE_PREFIXES.some(p => path.includes(p)) ||
         path.startsWith('.') && !path.startsWith('.env');
}

/**
 * cleanPath: removes common root prefixes like "my-project/" or "src/"
 * so that files end up at a sensible root level.
 *
 * Strategy:
 *   - If all files share a single common root folder → strip it
 *   - If top-level is "src/" → keep src/ contents at root
 */
function cleanPaths(rawPaths) {
  // Find common prefix
  const parts = rawPaths.map(p => p.split('/'));
  let prefix = [];
  for (let i = 0; i < parts[0].length; i++) {
    if (parts.every(p => p[i] === parts[0][i])) prefix.push(parts[0][i]);
    else break;
  }

  // Strip the common folder prefix (but not if there's only one level)
  let strip = prefix.length > 0 && !rawPaths.every(p => p === prefix.join('/'))
    ? prefix.join('/') + '/'
    : '';

  return rawPaths.map(p => {
    let clean = strip ? p.slice(strip.length) : p;
    // If remaining path starts with src/, strip that too
    if (clean.startsWith('src/')) clean = clean.slice(4);
    return clean;
  });
}

/**
 * importZIP(file: File) → { name: string, files: Record<string, string> }
 */
export async function importZIP(file) {
  const zip = await JSZip.loadAsync(file);
  const rawFiles = {};

  // Collect all text files
  const promises = [];
  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;
    if (shouldIgnore(relativePath)) return;
    if (!isTextFile(relativePath)) return;

    promises.push(
      zipEntry.async('string').then(content => {
        rawFiles[relativePath] = content;
      })
    );
  });

  await Promise.all(promises);

  // Clean paths
  const rawPaths   = Object.keys(rawFiles);
  if (rawPaths.length === 0) throw new Error('ZIP لا يحتوي على ملفات نصية قابلة للقراءة');

  const cleanedPaths = cleanPaths(rawPaths);
  const files = {};
  rawPaths.forEach((raw, i) => {
    const clean = cleanedPaths[i];
    if (clean) files[clean] = rawFiles[raw];
  });

  // Project name from ZIP filename
  const name = file.name.replace(/\.zip$/i, '') || 'Imported Project';

  return { name, files };
}

/**
 * exportZIP(projectName, files) → triggers browser download
 */
export async function exportZIP(projectName, files) {
  const zip = new JSZip();
  const folderName = projectName.replace(/\s+/g, '-').replace(/[^\w-]/g, '') || 'project';
  const root = zip.folder(folderName);

  for (const [path, content] of Object.entries(files)) {
    root.file(path, content);
  }

  const blob = await zip.generateAsync({
    type:               'blob',
    compression:        'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = `${folderName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * readUploadedFiles(fileList: FileList) → Record<string, string>
 * يقرأ ملفات متعددة من input[type=file] multiple
 */
export async function readUploadedFiles(fileList) {
  const files = {};
  const promises = [];

  for (const file of fileList) {
    if (!isTextFile(file.name)) continue;
    const relativePath = file.webkitRelativePath || file.name;
    const cleanedPath  = relativePath.replace(/^[^/]+\//, ''); // strip top dir if any

    promises.push(
      file.text().then(content => {
        files[cleanedPath || file.name] = content;
      })
    );
  }

  await Promise.all(promises);
  return files;
}
