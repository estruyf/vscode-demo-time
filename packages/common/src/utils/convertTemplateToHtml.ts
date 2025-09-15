import Handlebars from 'handlebars';

export const convertTemplateToHtml = (template: string, data: any, webviewUrl?: string | null) => {
  Handlebars.registerHelper('eq', (a, b) => {
    return a === b;
  });

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
