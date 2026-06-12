/**
 * Formats a session filename into a human-readable date string.
 *
 * Converts filenames like "2024-01-15T10-30-45-123Z_live.json"
 * to "2024/01/15 10:30:45.123Z"
 *
 * @param filename - The session filename to format
 * @returns A formatted date string
 */
export function formatSessionFilename(filename: string): string {
  const parts = filename.replace('.json', '').split('_');

  // Remove the type suffix (last part)
  parts.pop();

  // Join remaining parts and format the date/time
  const dateStr = parts
    .join('_')
    .replace(/(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})/, '$1/$2/$3 $4:$5:$6.$7');

  return dateStr;
}
