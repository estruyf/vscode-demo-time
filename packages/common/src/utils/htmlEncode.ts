/**
 * Escapes the HTML special characters so the value can be used in HTML text or attribute values.
 */
export const htmlEncode = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
