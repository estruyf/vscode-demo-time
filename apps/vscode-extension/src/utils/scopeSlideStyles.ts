/**
 * Turns the `<style>` blocks of the server rendered slide HTML into Tailwind style blocks scoped
 * to the slide.
 *
 * `renderToString` escapes the text of a `<style>` element (`"` becomes `&quot;`, `>` becomes
 * `&gt;`, ...), but the browser doesn't decode entities in `<style>` content. One invalid
 * declaration makes the Tailwind browser compiler fail, which removes the styles of the whole
 * page, so the entities are decoded again.
 */
export const scopeSlideStyles = (html: string, selector: string): string =>
  html.replace(
    /<style>([\s\S]*?)<\/style>/g,
    (_, css: string) =>
      `<style type="text/tailwindcss">${selector} {${decodeStyleEntities(css)}}</style>`,
  );

const decodeStyleEntities = (css: string): string =>
  css
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&');

/**
 * Makes the relative `url()` references of a stylesheet absolute, so fonts and images of a theme
 * still load when its CSS is inlined in an HTML file in another folder.
 *
 * @param css - The CSS of the stylesheet
 * @param stylesheetUrl - The URL of the stylesheet file, e.g. `file:///project/.demo/theme.css`
 */
export const rebaseCssUrls = (css: string, stylesheetUrl: string): string =>
  css.replace(
    /url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")\s]+))\s*\)/g,
    (match, doubleQuoted?: string, singleQuoted?: string, unquoted?: string) => {
      const value = doubleQuoted ?? singleQuoted ?? unquoted ?? '';
      if (!value || /^([a-z][a-z0-9+.-]*:|\/|#)/i.test(value)) {
        return match;
      }

      try {
        return `url("${new URL(value, stylesheetUrl).toString()}")`;
      } catch {
        return match;
      }
    },
  );
