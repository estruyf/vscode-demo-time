import * as React from 'react';
import {
  Download,
  FilePlus2,
  Upload,
  ChevronDown,
  RotateCcw,
  Undo2,
  Redo2,
} from 'lucide-react';
import { PRESETS } from '../../utils/theme-builder/presets';
import { btnGhost, btnPrimary, btnSecondary } from './controls';
import { DemoTimeLogo } from './DemoTimeLogo';

const iconBtn =
  'flex h-8 w-8 items-center justify-center rounded-md text-gray-300 hover:bg-[var(--color-surface-3)] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent';

export function Toolbar({
  onApplyPreset,
  onImport,
  onReset,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  onApplyPreset: (presetId: string) => void;
  onImport: () => void;
  /** Reset the working theme back to the blank default. */
  onReset: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
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
        <span className="flex h-7 w-7 items-center justify-center rounded-md text-white">
          <DemoTimeLogo />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-gray-100">Theme Builder (beta)</p>
        </div>
      </div>

      <div className="ml-2 flex items-center gap-1">
        <button
          type="button"
          className={iconBtn}
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl/Cmd+Z)"
          aria-label="Undo"
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          className={iconBtn}
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl/Cmd+Shift+Z)"
          aria-label="Redo"
        >
          <Redo2 size={16} />
        </button>
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

      <button
        type="button"
        className={btnSecondary}
        onClick={onReset}
        title="Reset to a blank default theme"
      >
        <RotateCcw size={15} /> Reset
      </button>
      <button type="button" className={btnSecondary} onClick={onImport}>
        <Upload size={15} /> Import
      </button>
      <button type="button" className={btnPrimary} onClick={onExport}>
        <Download size={15} /> Export
      </button>
    </header>
  );
}
