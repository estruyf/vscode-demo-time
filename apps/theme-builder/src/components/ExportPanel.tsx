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

  const usage = `---
theme: ${sanitizeName(model.name)}
customTheme: ./${filename}
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
            Save the file in your project (for example under <code className="rounded bg-black/40 px-1">.demo/theme/</code>)
            and reference it from a slide’s front matter — or set{' '}
            <code className="rounded bg-black/40 px-1">demoTime.customTheme</code> in{' '}
            <code className="rounded bg-black/40 px-1">.vscode/settings.json</code> to apply it to every slide.
          </p>
          <pre className="overflow-x-auto rounded-lg border border-[var(--color-line)] bg-black/40 p-3 text-xs leading-relaxed text-gray-200">
            {usage}
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
            The file includes a small comment with the builder’s data so you can re-import and keep
            editing it later with full fidelity.
          </p>
        </div>
      </div>
    </Modal>
  );
}
