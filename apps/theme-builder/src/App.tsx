import * as React from 'react';
import type { LayoutKey, ThemeModel } from './types/theme';
import { useThemeModel } from './hooks/useThemeModel';
import { getPreset } from './lib/presets';
import { createDefaultTheme } from './lib/defaultTheme';
import { isVsCode, vscodeThemeColors } from './lib/importVscodeTheme';
import { Toolbar } from './components/Toolbar';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { ImportPanel } from './components/ImportPanel';
import { ExportPanel, type ExportResult } from './components/ExportPanel';
import { Modal } from './components/Modal';
import { btnPrimary, btnSecondary } from './components/controls';

const SIDEBAR_KEY = 'demotime.theme-builder.sidebar-width';
const SIDEBAR_MIN = 280;
const SIDEBAR_MAX = 640;
const SIDEBAR_DEFAULT = 360;

interface AppProps {
  /**
   * When provided (inside VS Code), exporting saves the theme into the
   * workspace instead of downloading it as a file.
   */
  onExportTheme?: (filename: string, css: string, setAsDefault: boolean) => Promise<ExportResult>;
}

export default function App({ onExportTheme }: AppProps) {
  const api = useThemeModel();
  const [selectedLayout, setSelectedLayout] = React.useState<LayoutKey>('default');
  const [isLight, setIsLight] = React.useState(false);
  const [dialog, setDialog] = React.useState<'import' | 'export' | 'reset' | null>(null);

  const [sidebarWidth, setSidebarWidth] = React.useState<number>(() => {
    const saved = Number(localStorage.getItem(SIDEBAR_KEY));
    return saved >= SIDEBAR_MIN && saved <= SIDEBAR_MAX ? saved : SIDEBAR_DEFAULT;
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(sidebarWidth));
    } catch {
      // ignore storage failures (private mode)
    }
  }, [sidebarWidth]);

  const startResize = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => {
      setSidebarWidth(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, ev.clientX)));
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const resizeByKey = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSidebarWidth((w) => Math.max(SIDEBAR_MIN, w - 16));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSidebarWidth((w) => Math.min(SIDEBAR_MAX, w + 16));
    }
  }, []);

  const applyPreset = (presetId: string) => {
    const preset = getPreset(presetId);
    if (!preset) {
      return;
    }
    // window.confirm is blocked in VS Code webviews (it silently returns a
    // falsy value), so apply directly there — undo restores the previous theme.
    if (
      !isVsCode &&
      !window.confirm('Start a new theme from this preset? Your current theme will be replaced.')
    ) {
      return;
    }
    api.setModel(preset.create());
    setSelectedLayout('default');
    setIsLight(false);
  };

  const importModel = (model: ThemeModel) => {
    api.setModel(model);
    setSelectedLayout('default');
    setIsLight(false);
    setDialog(null);
  };

  const resetToDefault = () => {
    setDialog('reset');
  };

  const confirmReset = () => {
    api.setModel(createDefaultTheme());
    setSelectedLayout('default');
    setIsLight(false);
    setDialog(null);
  };

  // Keyboard undo/redo. Skip when typing in a textarea (the import paste box),
  // where native text undo is expected.
  const { undo, redo } = api;
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextEditingTarget =
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        !!target?.closest('[contenteditable="true"]');

      if (!(e.metaKey || e.ctrlKey) || isTextEditingTarget) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return (
    <div className="flex h-screen flex-col">
      <Toolbar
        onApplyPreset={applyPreset}
        onImport={() => setDialog('import')}
        onImportVscodeTheme={
          isVsCode ? () => api.updateColors(vscodeThemeColors()) : undefined
        }
        onReset={resetToDefault}
        onExport={() => setDialog('export')}
        onUndo={api.undo}
        onRedo={api.redo}
        canUndo={api.canUndo}
        canRedo={api.canRedo}
      />

      <div className="flex min-h-0 flex-1">
        <aside
          style={{ width: sidebarWidth }}
          className="shrink-0 overflow-y-auto bg-[var(--color-surface-2)]"
        >
          <Editor api={api} selectedLayout={selectedLayout} onSelectLayout={setSelectedLayout} />
        </aside>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          aria-valuemin={SIDEBAR_MIN}
          aria-valuemax={SIDEBAR_MAX}
          aria-valuenow={sidebarWidth}
          tabIndex={0}
          onMouseDown={startResize}
          onKeyDown={resizeByKey}
          className="group relative w-px shrink-0 cursor-col-resize bg-[var(--color-line)] outline-none"
        >
          {/* wider invisible hit area + hover/focus highlight */}
          <span className="absolute inset-y-0 -left-1 -right-1 z-10 transition-colors group-hover:bg-[var(--color-brand)]/40 group-focus-visible:bg-[var(--color-brand)]/60" />
        </div>

        <main className="min-w-0 flex-1">
          <Preview
            model={api.model}
            selectedLayout={selectedLayout}
            onSelectLayout={setSelectedLayout}
            isLight={isLight}
            onToggleLight={() => setIsLight((v) => !v)}
          />
        </main>
      </div>

      {dialog === 'import' && (
        <ImportPanel onImport={importModel} onClose={() => setDialog(null)} />
      )}
      {dialog === 'export' && (
        <ExportPanel model={api.model} onClose={() => setDialog(null)} onExport={onExportTheme} />
      )}
      {dialog === 'reset' && (
        <Modal
          title="Reset theme"
          onClose={() => setDialog(null)}
          footer={
            <>
              <button type="button" className={btnSecondary} onClick={() => setDialog(null)}>
                Cancel
              </button>
              <button type="button" className={btnPrimary} onClick={confirmReset}>
                Reset to blank theme
              </button>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-gray-300">
            This will reset your theme to a blank default. Your current theme will be replaced.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">
            You can undo this action with Ctrl/Cmd+Z.
          </p>
        </Modal>
      )}
    </div>
  );
}
