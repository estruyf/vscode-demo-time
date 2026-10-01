import { convertTemplateToHtml } from './convertTemplateToHtml';
import { htmlEncode } from './htmlEncode';

export interface TemplateErrorOptions {
  /**
   * Short description of what failed, e.g. "Custom layout error"
   */
  title: string;
  /**
   * Path of the template file, shown on the slide and in the log
   */
  path?: string;
  /**
   * Render a single-line error, for small areas like the slide header and footer
   */
  compact?: boolean;
}

export interface TemplateRenderResult {
  html: string;
  /**
   * Message to log when the template could not be rendered
   */
  error?: string;
}

export const getTemplateErrorMessage = ({ title, path }: TemplateErrorOptions, message: string) =>
  `${title}${path ? ` (${path})` : ''}: ${message}`;

/**
 * Renders an error block that replaces a template which could not be loaded or rendered.
 * It uses inline styles so it also renders in the PDF export and slide screenshots.
 */
export const renderTemplateError = (
  { title, path, compact }: TemplateErrorOptions,
  message: string,
) => {
  const safeTitle = htmlEncode(title);
  const safePath = path ? htmlEncode(path) : '';
  const safeMessage = htmlEncode(message);

  if (compact) {
    return `<div class="demotime__template-error" role="alert" style="color:#b91c1c;background:#fef2f2;border:1px solid #fca5a5;padding:0.25em 0.5em;font-family:sans-serif;font-size:0.75em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${safeMessage}">${safeTitle}${safePath ? ` (${safePath})` : ''}: ${safeMessage}</div>`;
  }

  return `<div class="demotime__template-error" role="alert" style="box-sizing:border-box;width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;gap:0.75em;padding:2em;color:#7f1d1d;background:#fef2f2;border:2px solid #f87171;font-family:sans-serif;text-align:left;overflow:auto;">
  <strong style="font-size:1.5em;">${safeTitle}</strong>
  ${safePath ? `<code style="font-size:1em;">${safePath}</code>` : ''}
  <pre style="margin:0;padding:1em;background:#fee2e2;color:#7f1d1d;font-size:0.9em;white-space:pre-wrap;word-break:break-word;">${safeMessage}</pre>
</div>`;
};

/**
 * Same as `convertTemplateToHtml`, but returns an error block instead of throwing when the
 * template is invalid (e.g. a Handlebars syntax error).
 */
export const tryConvertTemplateToHtml = (
  template: string,
  data: any,
  options: TemplateErrorOptions & { webviewUrl?: string | null },
): TemplateRenderResult => {
  try {
    return { html: convertTemplateToHtml(template, data, options.webviewUrl) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      html: renderTemplateError(options, message),
      error: getTemplateErrorMessage(options, message),
    };
  }
};
