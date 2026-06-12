import * as React from 'react';
import { ImageUp, Trash2 } from 'lucide-react';
import type { BackgroundImage, BackgroundRepeat, BackgroundSize } from '../types/theme';
import { Field, NumberField, SelectField, TextField } from './controls';

const EMPTY: BackgroundImage = {
  url: '',
  size: 'cover',
  position: 'center center',
  repeat: 'no-repeat',
  overlay: 0,
};

const POSITIONS = [
  'center center',
  'top center',
  'bottom center',
  'left center',
  'right center',
  'top left',
  'top right',
  'bottom left',
  'bottom right',
];

export function ImageField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: BackgroundImage | null;
  onChange: (value: BackgroundImage | null) => void;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);

  const current = value ?? EMPTY;
  const patch = (changes: Partial<BackgroundImage>) => onChange({ ...current, ...changes });

  const onFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image is larger than 2 MB — it will be embedded as a big data URL. A hosted URL is recommended.');
    }
    const reader = new FileReader();
    reader.onload = () => patch({ url: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <Field label={label} hint={hint}>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-dashed border-[var(--color-line)] px-3 py-2 text-xs text-gray-300 hover:border-[var(--color-brand)] hover:text-white"
          >
            <ImageUp size={14} /> Upload image
          </button>
          {value?.url && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center justify-center rounded-md border border-[var(--color-line)] px-2.5 text-gray-400 hover:border-red-500 hover:text-red-400"
              title="Remove image"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </Field>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onFile(file);
          }
          e.target.value = '';
        }}
      />

      <TextField
        label="…or image URL"
        value={current.url.startsWith('data:') ? '' : current.url}
        placeholder={current.url.startsWith('data:') ? 'Uploaded image (data URL)' : 'https://…'}
        onChange={(url) => patch({ url })}
        mono
      />

      {error && <p className="text-[11px] leading-snug text-amber-400">{error}</p>}

      {value?.url && (
        <>
          <div
            className="h-20 w-full rounded-md border border-[var(--color-line)] bg-gray-900"
            style={{
              backgroundImage: `url("${value.url}")`,
              backgroundSize: value.size,
              backgroundPosition: value.position,
              backgroundRepeat: value.repeat,
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField<BackgroundSize>
              label="Fit"
              value={value.size}
              onChange={(size) => patch({ size })}
              options={[
                { label: 'Cover', value: 'cover' },
                { label: 'Contain', value: 'contain' },
                { label: 'Auto', value: 'auto' },
              ]}
            />
            <SelectField<BackgroundRepeat>
              label="Repeat"
              value={value.repeat}
              onChange={(repeat) => patch({ repeat })}
              options={[
                { label: 'No repeat', value: 'no-repeat' },
                { label: 'Tile', value: 'repeat' },
                { label: 'Tile X', value: 'repeat-x' },
                { label: 'Tile Y', value: 'repeat-y' },
              ]}
            />
          </div>
          <SelectField
            label="Position"
            value={value.position}
            onChange={(position) => patch({ position })}
            options={POSITIONS.map((p) => ({ label: p, value: p }))}
          />
          <NumberField
            label="Darken overlay"
            value={value.overlay}
            onChange={(overlay) => patch({ overlay })}
            min={0}
            max={90}
            step={5}
            unit="%"
          />
        </>
      )}
    </div>
  );
}
