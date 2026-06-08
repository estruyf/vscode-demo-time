import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { formatColor, parseColor, rgbToHex } from '../lib/color';

/* Shared button styles. */
export const btnBase =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';
export const btnPrimary = `${btnBase} bg-[var(--color-brand)] text-black hover:brightness-95`;
export const btnSecondary = `${btnBase} border border-[var(--color-line)] text-gray-200 hover:border-[var(--color-brand)] hover:text-white`;
export const btnGhost = `${btnBase} text-gray-300 hover:bg-[var(--color-surface-3)] hover:text-white`;

/* --------------------------------------------------------------- Section */

export function Section({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section className="border-b border-[var(--color-line)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-gray-100 hover:bg-[var(--color-surface-2)]"
      >
        {icon && <span className="text-[var(--color-brand)]">{icon}</span>}
        <span className="flex-1">{title}</span>
        <ChevronDown
          size={16}
          className={clsx('text-gray-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className="space-y-4 px-4 pb-5 pt-1">{children}</div>}
    </section>
  );
}

/* ----------------------------------------------------------------- Field */

export function Field({
  label,
  hint,
  children,
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-xs font-medium text-gray-400">{label}</span>
      )}
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-snug text-gray-500">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-gray-100 outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]';

/* ------------------------------------------------------------- TextField */

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="text"
        className={clsx(inputClass, mono && 'font-mono text-xs')}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

/* ----------------------------------------------------------- SelectField */

export function SelectField<T extends string>({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label?: string;
  hint?: string;
  value: T;
  onChange: (value: T) => void;
  options: { label: string; value: T }[];
}) {
  return (
    <Field label={label} hint={hint}>
      <select
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/* ----------------------------------------------------------- NumberField */

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  // Keep a local string buffer while the number box is focused so the user can
  // clear it or type fractional values ("1.", "0.2") digit by digit. Only valid,
  // clamped numbers are committed to the model.
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState(String(value));

  const commit = (raw: string) => {
    const n = parseFloat(raw);
    if (!Number.isNaN(n)) {
      onChange(Math.min(max, Math.max(min, n)));
    }
  };

  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          aria-label={label ? `${label} slider` : undefined}
          className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-line)] accent-[var(--color-brand)]"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <div className="flex w-20 items-center gap-1">
          <input
            type="number"
            aria-label={label ? `${label} value` : undefined}
            className={clsx(inputClass, 'px-1.5 py-1 text-right')}
            min={min}
            max={max}
            step={step}
            value={focused ? draft : value}
            onFocus={() => {
              setDraft(String(value));
              setFocused(true);
            }}
            onChange={(e) => {
              setDraft(e.target.value);
              commit(e.target.value);
            }}
            onBlur={() => setFocused(false)}
          />
          {unit && <span className="text-xs text-gray-500">{unit}</span>}
        </div>
      </div>
    </Field>
  );
}

/* ---------------------------------------------------------------- Toggle */

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between text-sm text-gray-200"
    >
      <span>{label}</span>
      <span
        className={clsx(
          'relative h-5 w-9 rounded-full transition-colors',
          checked ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-line)]'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
            checked ? 'left-0.5 translate-x-4' : 'left-0.5'
          )}
        />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------ ColorField */

const CHECKER =
  'linear-gradient(45deg,#555 25%,transparent 25%),linear-gradient(-45deg,#555 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#555 75%),linear-gradient(-45deg,transparent 75%,#555 75%)';

export function ColorField({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const rgba = parseColor(value);
  const isTransparent = !value || value === 'transparent';
  const pickerHex = rgba ? rgbToHex(rgba.r, rgba.g, rgba.b) : '#000000';

  // Changing the picker keeps the current alpha; changing the slider keeps the
  // current colour. Both only apply when the value is a parseable solid colour
  // (gradients / var() stay free-text only).
  const onPick = (hex: string) => {
    const next = parseColor(hex);
    if (next) {
      onChange(formatColor({ ...next, a: rgba ? rgba.a : 1 }));
    }
  };
  const onAlpha = (pct: number) => {
    if (rgba) {
      onChange(formatColor({ ...rgba, a: pct / 100 }));
    }
  };

  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <span
          className="relative h-8 w-8 shrink-0 overflow-hidden rounded border border-[var(--color-line)]"
          style={{
            backgroundImage: CHECKER,
            backgroundSize: '10px 10px',
            backgroundPosition: '0 0,0 5px,5px -5px,-5px 0',
          }}
        >
          {!isTransparent && (
            <span className="absolute inset-0" style={{ background: value }} />
          )}
          <input
            type="color"
            value={pickerHex}
            onChange={(e) => onPick(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={label ? `${label} color picker` : 'color picker'}
          />
        </span>
        <input
          type="text"
          aria-label={label ? `${label} value` : 'color value'}
          className={clsx(inputClass, 'font-mono text-xs')}
          value={value}
          placeholder="#000000 / rgba() / linear-gradient()"
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {rgba && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="range"
            aria-label={label ? `${label} opacity` : 'opacity'}
            title="Opacity"
            className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-line)] accent-[var(--color-brand)]"
            min={0}
            max={100}
            step={1}
            value={Math.round(rgba.a * 100)}
            onChange={(e) => onAlpha(Number(e.target.value))}
          />
          <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-gray-400">
            {Math.round(rgba.a * 100)}%
          </span>
        </div>
      )}
    </Field>
  );
}
