/**
 * TabBar.jsx — Open file tabs (similar to VS Code tabs)
 */
import { useRef, useEffect } from 'react';
import useIDEStore from '../../store/useIDEStore';
import { FILE_ICONS } from '../../utils/defaultFiles';

function getExt(name) { return name.split('.').pop().toLowerCase(); }

export default function TabBar() {
  const { openTabs, activeFile, openFile, closeTab } = useIDEStore();
  const scrollRef = useRef(null);

  // Scroll active tab into view
  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [activeFile]);

  if (!openTabs.length) return null;

  return (
    <div
      className="flex items-end flex-shrink-0 overflow-x-auto overflow-y-hidden"
      ref={scrollRef}
      style={{
        height:      40,
        background:  'var(--ide-surface)',
        borderBottom: '1px solid var(--ide-border)',
      }}
    >
      {openTabs.map(filename => {
        const isActive = filename === activeFile;
        const ext  = getExt(filename);
        const icon = FILE_ICONS[ext] ?? '📄';

        return (
          <div
            key={filename}
            data-active={isActive}
            className={`tab-item ${isActive ? 'active' : ''} group`}
            onClick={() => openFile(filename)}
            style={{ minWidth: 0 }}
            title={filename}
          >
            {/* File type icon */}
            <span className="text-sm leading-none flex-shrink-0 select-none">{icon}</span>

            {/* Filename */}
            <span className="font-mono text-[12px] truncate max-w-[120px]">
              {filename}
            </span>

            {/* Close button */}
            <button
              onClick={e => { e.stopPropagation(); closeTab(filename); }}
              className="flex-shrink-0 ml-0.5 w-4 h-4 rounded flex items-center justify-center
                         opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
              style={{ color: 'var(--ide-textMuted)' }}
              title="Close tab"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        );
      })}

      {/* Filler to push tabs left */}
      <div className="flex-1" style={{ borderBottom: '2px solid transparent' }} />
    </div>
  );
}
