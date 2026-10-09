import Handlebars from 'handlebars';
import { formatDate, toDate } from './formatDate';

const DEFAULT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

/**
 * `{{date}}` and `{{date "d MMM yyyy"}}`. Without a format, a `date` front matter property is
 * returned as is, like before the helper existed. With a format, it formats the `date` front
 * matter property, or today's date when there isn't one.
 */
function dateHelper(this: any, ...args: any[]) {
  // The last argument is the Handlebars options object
  const format = args.length > 1 && typeof args[0] === 'string' ? args[0] : undefined;
  const value = this && typeof this === 'object' ? this.date : undefined;

  if (!format && value !== undefined && value !== null && value !== '') {
    // YAML parses an unquoted `date: 2026-10-01` as a date, show it the way it was written
    if (value instanceof Date && value.getUTCHours() === 0 && value.getUTCMinutes() === 0) {
      const date = toDate(value);
      return date ? formatDate(date, 'yyyy-MM-dd') : value;
    }
    return value;
  }

  const date = toDate(value) ?? new Date();
  return format
    ? formatDate(date, format)
    : date.toLocaleDateString(undefined, DEFAULT_DATE_FORMAT);
}

let helpersRegistered = false;
const registerHelpers = () => {
  if (helpersRegistered) {
    return;
  }

  Handlebars.registerHelper('eq', (a, b) => {
    return a === b;
  });
  Handlebars.registerHelper('date', dateHelper);
  helpersRegistered = true;
};

export const convertTemplateToHtml = (template: string, data: any, webviewUrl?: string | null) => {
  registerHelpers();

  const templateFunction = Handlebars.compile(template);
  let html = templateFunction(data);

  if (webviewUrl) {
    const imgTagRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    html = html.replace(imgTagRegex, (match, src) => {
      // Only prefix if not already prefixed and not an absolute URL
      if (!src.startsWith(webviewUrl) && !/^https?:\/\//.test(src)) {
        const normalizedUrl = webviewUrl.endsWith('/') ? webviewUrl : `${webviewUrl}/`;
        const normalizedSrc = src.replace(/^(\.\/|\/)/, '');
        return match.replace(src, `${normalizedUrl}${normalizedSrc}`);
      }
      return match;
    });
  }

  return html;
};
