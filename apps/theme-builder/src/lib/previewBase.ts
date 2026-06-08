/**
 * Everything needed to render a Demo Time slide *exactly* the way the real
 * extension does — minus the theme. The generated theme CSS layers on top of
 * this, just like a real custom theme layers on top of the webview's
 * `preview.css` at runtime.
 *
 *  1. PREFLIGHT_CSS  – the relevant subset of Tailwind's reset that Demo Time
 *                      ships, so headings/lists/margins start from a clean slate.
 *  2. BASE_CSS       – a plain-CSS port of apps/webviews/src/styles/preview.css
 *                      (the structural rules shared by every slide).
 */

export const PREFLIGHT_CSS = `
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }
html, body { height: 100%; }
body { line-height: 1.5; -webkit-font-smoothing: antialiased; }
h1, h2, h3, h4, h5, h6 { font-size: inherit; font-weight: inherit; }
ul, ol { list-style: none; padding: 0; }
a { color: inherit; text-decoration: inherit; }
img, svg, video { display: block; max-width: 100%; }
blockquote, figure { margin: 0; }
code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
`;

export const BASE_CSS = `
:root { --demotime-transition-duration: 0.5s; --spacing: 0.25rem; }

.slide__layout { height: 100%; width: 100%; position: relative; }

.slide__header {
  position: absolute; top: 0; left: 0; width: 100%; height: 2rem;
  font-size: 0.75rem; padding: 0 2rem;
  display: flex; align-items: center; justify-content: center; opacity: 0.75;
}
.slide__footer {
  position: absolute; bottom: 0; left: 0; width: 100%; height: 2rem;
  font-size: 0.75rem; padding: 0 2rem;
  display: flex; align-items: center; justify-content: space-between; opacity: 0.75;
}

.slide__content { height: 100%; width: 100%; font-size: 1rem; overflow: hidden; position: relative; z-index: 20; }
.slide__content .slide__content__inner,
.slide__content .slide__content__custom {
  position: relative; height: 100%; width: 100%; z-index: 20; box-sizing: border-box;
}

.slide__image_left, .slide__image_right { z-index: 10; }

/* image-left / image-right turn the layout box into a 2 column grid */
.image-left, .image-right {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%; height: 100%; grid-auto-rows: 1fr;
}

/* the dedicated "center" layout */
.center .slide__content { display: flex; align-items: center; justify-content: center; }
.center .slide__content .slide__content__inner {
  display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
}
`;

/**
 * Assemble a full HTML document for the preview iframe. The structure mirrors
 * MarkdownPreview.tsx exactly: .slide > .slide__container > .slide__layout.
 */
export function buildPreviewDocument(options: {
  themeName: string;
  layoutClass: string;
  themeCss: string;
  slideInner: string;
  isLight: boolean;
  /** Preview-only CSS (e.g. placeholder side images) the theme can override. */
  previewCss?: string;
}): string {
  const { themeName, layoutClass, themeCss, slideInner, isLight, previewCss = '' } = options;
  const lightClass = isLight ? ' light' : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${PREFLIGHT_CSS}</style>
    <style>${BASE_CSS}</style>
    <style>${previewCss}</style>
    <style id="theme">${themeCss}</style>
    <style>
      html, body { margin: 0; padding: 0; background: #000; }
      .slide { position: relative; width: 960px; height: 540px; overflow: hidden; }
      /* The transform mirrors MarkdownPreview's scaled container: it makes this
         element the containing block + stacking context for the fixed-position
         .slide__video, so a background video sits above the slide background
         (exactly as in the real extension). */
      .slide__container { position: absolute; inset: 0; width: 960px; height: 540px; transform: scale(1); }
    </style>
  </head>
  <body>
    <div class="slide ${themeName}${lightClass}">
      <div class="slide__container">
        <div class="slide__layout ${layoutClass}">
          ${slideInner}
        </div>
      </div>
    </div>
  </body>
</html>`;
}
