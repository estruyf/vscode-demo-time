import * as React from 'react';
import { Check, Copy, Download } from 'lucide-react';
import type { ThemeModel } from '../types/theme';
import { generateCss, sanitizeName } from '../lib/generateCss';
import { copyText, downloadText } from '../lib/download';
import { Modal } from './Modal';
import { btnPrimary, btnSecondary } from './controls';

export function ExportPanel({ model, onClose }: { model: ThemeModel; onClose: () => void }) {
  const css = React.useMemo(() => generateCss(model), [model]);
  const filename = `${sanitizeName(model.name)}.css`;
  const [copied, setCopied] = React.useState(false);

  const onCopy = async () => {
    if (await copyText(css)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
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
          <button
            type="button"
            className={btnPrimary}
            onClick={() => downloadText(filename, css)}
          >
            <Download size={15} /> Download {filename}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-400">How to use it</p>
          <p className="mb-2 text-[13px] leading-relaxed text-gray-300">
            Save the file in your project under{' '}
            <code className="rounded bg-black/40 px-1">.demo/theme/</code> and add the path to your{' '}
            <code className="rounded bg-black/40 px-1">.vscode/settings.json</code>:
          </p>
          <pre className="overflow-x-auto rounded-lg border border-[var(--color-line)] bg-black/40 p-3 text-xs leading-relaxed text-gray-200">
            {vscodeSettings}
          </pre>
          <p className="mt-3 mb-2 text-[13px] leading-relaxed text-gray-300">
            Then reference the theme by name in your slide's front matter:
          </p>
          <pre className="overflow-x-auto rounded-lg border border-[var(--color-line)] bg-black/40 p-3 text-xs leading-relaxed text-gray-200">
            {slideUsage}
          </pre>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-400">
            {filename} ({css.split('\n').length} lines)
          </p>
          <pre className="max-h-[40vh] overflow-auto rounded-lg border border-[var(--color-line)] bg-black/40 p-3 text-[11px] leading-relaxed text-gray-300">
            {css}
          </pre>
          <p className="mt-1.5 text-[11px] leading-snug text-gray-500">
            The file includes a small comment with the builder's data so you can re-import and keep
            editing it later with full fidelity.
          </p>
        </div>
      </div>
    </Modal>
  );
}
