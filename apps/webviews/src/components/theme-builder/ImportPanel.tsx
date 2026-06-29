import * as React from 'react';
import { FileUp, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { ThemeModel } from '../../types/theme';
import { parseCss } from '../../utils/theme-builder/parseCss';
import { Modal } from './Modal';
import { btnGhost, btnPrimary } from './controls';

export function ImportPanel({
  onImport,
  onClose,
}: {
  onImport: (model: ThemeModel) => void;
  onClose: () => void;
}) {
  const [text, setText] = React.useState('');
  const [dragging, setDragging] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const result = React.useMemo(() => (text.trim() ? parseCss(text) : null), [text]);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result));
    reader.readAsText(file);
  };

  return (
    <Modal
      title="Import theme"
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={!result}
            onClick={() => {
              if (result) {
                onImport(result.model);
              }
            }}
          >
            Import &amp; edit
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          aria-label="Browse for a CSS theme file to import"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) {
              readFile(file);
            }
          }}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
          className={[
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
            dragging
              ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/5'
              : 'border-[var(--color-line)] hover:border-[var(--color-brand)]',
          ].join(' ')}
        >
          <FileUp size={22} className="text-gray-400" />
          <p className="text-sm text-gray-200">Drop a .css theme file here, or click to browse</p>
          <input
            ref={fileRef}
            type="file"
            accept=".css,text/css"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                readFile(file);
              }
              e.target.value = '';
            }}
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-400">…or paste CSS</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder=".slide.my-theme { … }"
            spellCheck={false}
            className="h-40 w-full resize-y rounded-lg border border-[var(--color-line)] bg-black/40 p-3 font-mono text-xs text-gray-200 outline-none focus:border-[var(--color-brand)]"
          />
        </div>

        {result && (
          <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-3 text-[13px]">
            <p className="text-gray-200">
              Detected theme: <span className="font-semibold">{result.model.displayName}</span>{' '}
              <span className="font-mono text-xs text-gray-400">(.slide.{result.model.name})</span>
            </p>
            {result.lossless ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck size={14} /> Created with the Theme Builder — will import with full fidelity.
              </p>
            ) : (
              result.warnings.map((w) => (
                <p key={w} className="mt-1.5 flex items-start gap-1.5 text-amber-400">
                  <TriangleAlert size={14} className="mt-0.5 shrink-0" /> {w}
                </p>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
