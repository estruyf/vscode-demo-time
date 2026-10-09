// Longest tokens first, so `MMMM` wins over `MMM` and `MM`. Text between single quotes is literal.
const TOKEN_REGEX = /'([^']*)'|yyyy|yy|MMMM|MMM|MM|M|dd|d|EEEE|EEE|HH|H|hh|h|mm|m|ss|s|a/g;

const pad = (value: number) => value.toString().padStart(2, '0');

/**
 * Formats a date with date-fns style tokens, e.g. `d MMM yyyy` or `EEEE, MMMM d`.
 * Month and day names use the locale of the environment. Text between single quotes is kept as
 * is, e.g. `'Week of' d MMM`.
 *
 * @param date The date to format
 * @param format The format, e.g. `yyyy-MM-dd`
 * @param locale The locale for the month and day names, defaults to the environment locale
 */
export const formatDate = (date: Date, format: string, locale?: string) => {
  const name = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, options).format(date);

  return format.replace(TOKEN_REGEX, (token: string, literal?: string) => {
    if (literal !== undefined) {
      // `''` is an escaped single quote
      return literal || `'`;
    }

    const hours = date.getHours();
    switch (token) {
      case 'yyyy':
        return date.getFullYear().toString();
      case 'yy':
        return pad(date.getFullYear() % 100);
      case 'MMMM':
        return name({ month: 'long' });
      case 'MMM':
        return name({ month: 'short' });
      case 'MM':
        return pad(date.getMonth() + 1);
      case 'M':
        return (date.getMonth() + 1).toString();
      case 'dd':
        return pad(date.getDate());
      case 'd':
        return date.getDate().toString();
      case 'EEEE':
        return name({ weekday: 'long' });
      case 'EEE':
        return name({ weekday: 'short' });
      case 'HH':
        return pad(hours);
      case 'H':
        return hours.toString();
      case 'hh':
        return pad(hours % 12 || 12);
      case 'h':
        return (hours % 12 || 12).toString();
      case 'mm':
        return pad(date.getMinutes());
      case 'm':
        return date.getMinutes().toString();
      case 'ss':
        return pad(date.getSeconds());
      case 's':
        return date.getSeconds().toString();
      case 'a':
        return hours < 12 ? 'AM' : 'PM';
      default:
        return token;
    }
  });
};

/**
 * Converts a front matter value to a date. A date-only value (`2026-10-01`) is a date in the local
 * time zone. YAML parses an unquoted date as midnight UTC, which is moved to local midnight so the
 * day doesn't change in time zones behind UTC.
 *
 * @returns The date, or `undefined` when the value isn't a valid date.
 */
export const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return undefined;
    }

    const isUtcMidnight =
      value.getUTCHours() === 0 &&
      value.getUTCMinutes() === 0 &&
      value.getUTCSeconds() === 0 &&
      value.getUTCMilliseconds() === 0;
    return isUtcMidnight
      ? new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
      : value;
  }

  if (typeof value === 'string' && value.trim()) {
    const dateOnly = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    }

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }

  return undefined;
};
