import * as React from 'react';
import { Download, FilePlus2, Upload, ChevronDown, Sparkles } from 'lucide-react';
import { PRESETS } from '../lib/presets';
import { btnGhost, btnPrimary, btnSecondary } from './controls';

export function Toolbar({
  onApplyPreset,
  onImport,
  onExport,
}: {
  onApplyPreset: (presetId: string) => void;
  onImport: () => void;
  onExport: () => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  return (
    <header className="flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-brand)] text-black">
          <Sparkles size={16} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-gray-100">Demo Time</p>
          <p className="-mt-0.5 text-[11px] text-gray-400">Theme Builder</p>
        </div>
      </div>

      <div className="flex-1" />

      <div className="relative" ref={menuRef}>
        <button type="button" className={btnGhost} onClick={() => setMenuOpen((o) => !o)}>
          <FilePlus2 size={15} /> New from preset <ChevronDown size={14} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-30 mt-1 w-72 overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] py-1 shadow-2xl">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onApplyPreset(p.id);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-[var(--color-surface-3)]"
              >
                <span className="text-sm font-medium text-gray-100">{p.label}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-gray-400">
                  {p.description}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" className={btnSecondary} onClick={onImport}>
        <Upload size={15} /> Import
      </button>
      <button type="button" className={btnPrimary} onClick={onExport}>
        <Download size={15} /> Export
      </button>
    </header>
  );
}
