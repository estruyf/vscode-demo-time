import * as React from 'react';
import { Check, Copy, Download, Save } from 'lucide-react';
import type { ThemeModel } from '../../types/theme';
import { generateCss, sanitizeName } from '../../utils/theme-builder/generateCss';
import { copyText, downloadText } from '../../utils/theme-builder/download';
import { Modal } from './Modal';
import { btnPrimary, btnSecondary } from './controls';

export interface ExportResult {
  success: boolean;
  message?: string;
}

/* High-contrast inline code chip + code block, readable on the dark panel. */
const inlineCode =
  'rounded border border-[var(--color-line)] bg-[var(--color-surface-3)] px-1.5 py-0.5 font-mono text-[0.85em] text-gray-100';
const codeBlock =
  'overflow-x-auto rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-3 font-mono text-xs leading-relaxed text-gray-100';

export function ExportPanel({
  model,
  onClose,
  onExport,
}: {
  model: ThemeModel;
  onClose: () => void;
  /**
   * When provided (inside VS Code), the theme is saved into the workspace
   * instead of downloaded. The panel closes itself on success and shows the
   * returned message on failure.
   */
  onExport?: (filename: string, css: string, setAsDefault: boolean) => Promise<ExportResult>;
}) {
  const css = React.useMemo(() => generateCss(model), [model]);
  const filename = `${sanitizeName(model.name)}.css`;
  const [copied, setCopied] = React.useState(false);
  const [setAsDefault, setSetAsDefault] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onCopy = async () => {
    if (await copyText(css)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const onSave = async () => {
    if (!onExport) {
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onExport(filename, css, setAsDefault);
    setSaving(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.message || 'Could not save the theme.');
    }
  };

  const themeName = sanitizeName(model.name);

  const vscodeSettings = `{
  "demoTime.customTheme": ".demo/theme/${filename}"
}`;

  const slideUsage = `---
theme: ${themeName}
---

# Your slide title`;

  return (
    <Modal
      title="Export theme"
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onCopy}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied' : 'Copy CSS'}
          </button>
          {onExport ? (
            <button type="button" className={btnPrimary} onClick={onSave} disabled={saving}>
              <Save size={15} /> {saving ? 'Saving…' : 'Save to workspace'}
            </button>
          ) : (
            <button
              type="button"
              className={btnPrimary}
              onClick={() => downloadText(filename, css)}
            >
              <Download size={15} /> Download {filename}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[13px] leading-relaxed text-red-300">
            {error}
          </p>
        )}

        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-400">How to use it</p>
          {onExport ? (
            <>
              <p className="mb-2 text-[13px] leading-relaxed text-gray-300">
                The theme is saved to{' '}
                <code className={inlineCode}>.demo/theme/{filename}</code> in your
                workspace.
              </p>
              <label className="mb-2 flex cursor-pointer items-center gap-2 text-[13px] leading-relaxed text-gray-300">
                <input
                  type="checkbox"
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--color-brand)]"
                />
                Set as default theme (updates{' '}
                <code className={inlineCode}>demoTime.customTheme</code>)
              </label>
            </>
          ) : (
            <>
              <p className="mb-2 text-[13px] leading-relaxed text-gray-300">
                Save the file in your project under{' '}
                <code className={inlineCode}>.demo/theme/</code> and add the path to
                your <code className={inlineCode}>.vscode/settings.json</code>:
              </p>
              <pre className={codeBlock}>{vscodeSettings}</pre>
            </>
          )}
          <p className="mt-3 mb-2 text-[13px] leading-relaxed text-gray-300">
            Then reference the theme by name in your slide's front matter:
          </p>
          <pre className={codeBlock}>{slideUsage}</pre>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-400">
            {filename} ({css.split('\n').length} lines)
          </p>
          <pre className={`${codeBlock} max-h-[40vh] overflow-auto text-[11px]`}>{css}</pre>
          <p className="mt-1.5 text-[11px] leading-snug text-gray-500">
            The file includes a small comment with the builder's data so you can re-import and keep
            editing it later with full fidelity.
          </p>
        </div>
      </div>
    </Modal>
  );
}
