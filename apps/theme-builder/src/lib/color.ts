/**
 * Small colour helpers so the editor can offer an opacity (alpha) control on top
 * of the native hex picker. Only *solid* colours are parseable — gradients,
 * `var(...)`, named colours and `transparent` return null, in which case the UI
 * falls back to plain text editing.
 */

export interface RGBA {
  r: number;
  g: number;
  b: number;
  /** 0–1 */
  a: number;
}

const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const clampUnit = (n: number) => Math.max(0, Math.min(1, n));

/** Parse a hex (#rgb/#rgba/#rrggbb/#rrggbbaa) or rgb()/rgba() string. */
export function parseColor(value: string): RGBA | null {
  if (!value) {
    return null;
  }
  const v = value.trim().toLowerCase();

  const hex = v.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    const h = hex[1];
    const dup = (c: string) => parseInt(c + c, 16);
    const pair = (i: number) => parseInt(h.slice(i, i + 2), 16);
    if (h.length === 3) {
      return { r: dup(h[0]), g: dup(h[1]), b: dup(h[2]), a: 1 };
    }
    if (h.length === 4) {
      return { r: dup(h[0]), g: dup(h[1]), b: dup(h[2]), a: dup(h[3]) / 255 };
    }
    if (h.length === 6) {
      return { r: pair(0), g: pair(2), b: pair(4), a: 1 };
    }
    if (h.length === 8) {
      return { r: pair(0), g: pair(2), b: pair(4), a: pair(6) / 255 };
    }
    return null;
  }

  const rgb = v.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[,/]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 3 && parts.every((p) => !p.includes('%'))) {
      const r = clampByte(parseFloat(parts[0]));
      const g = clampByte(parseFloat(parts[1]));
      const b = clampByte(parseFloat(parts[2]));
      const a = parts[3] !== undefined ? clampUnit(parseFloat(parts[3])) : 1;
      if ([r, g, b].every((n) => !Number.isNaN(n))) {
        return { r, g, b, a };
      }
    }
  }

  return null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => clampByte(n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Format an RGBA back to the most readable CSS string (hex if fully opaque). */
export function formatColor({ r, g, b, a }: RGBA): string {
  if (a >= 1) {
    return rgbToHex(r, g, b);
  }
  const alpha = Math.round(clampUnit(a) * 100) / 100;
  return `rgba(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)}, ${alpha})`;
}
