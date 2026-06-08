import * as React from 'react';
import type { LayoutKey, ThemeModel } from './types/theme';
import { useThemeModel } from './hooks/useThemeModel';
import { getPreset } from './lib/presets';
import { Toolbar } from './components/Toolbar';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { ImportPanel } from './components/ImportPanel';
import { ExportPanel } from './components/ExportPanel';

export default function App() {
  const api = useThemeModel();
  const [selectedLayout, setSelectedLayout] = React.useState<LayoutKey>('default');
  const [isLight, setIsLight] = React.useState(false);
  const [dialog, setDialog] = React.useState<'import' | 'export' | null>(null);

  const applyPreset = (presetId: string) => {
    const preset = getPreset(presetId);
    if (!preset) {
      return;
    }
    if (window.confirm('Start a new theme from this preset? Your current theme will be replaced.')) {
      api.setModel(preset.create());
      setSelectedLayout('default');
      setIsLight(false);
    }
  };

  const importModel = (model: ThemeModel) => {
    api.setModel(model);
    setSelectedLayout('default');
    setIsLight(false);
    setDialog(null);
  };

  // Keyboard undo/redo. Skip when typing in a textarea (the import paste box),
  // where native text undo is expected.
  const { undo, redo } = api;
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.target instanceof HTMLTextAreaElement) {
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
        onExport={() => setDialog('export')}
        onUndo={api.undo}
        onRedo={api.redo}
        canUndo={api.canUndo}
        canRedo={api.canRedo}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="w-[360px] shrink-0 overflow-y-auto border-r border-[var(--color-line)] bg-[var(--color-surface-2)]">
          <Editor api={api} selectedLayout={selectedLayout} />
        </aside>

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
        <ExportPanel model={api.model} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
