import type { LayoutKey } from '../types/theme';

/**
 * Sample slide bodies for each layout. The HTML mirrors exactly what Demo Time
 * renders inside `.slide__layout` (see MarkdownPreview.tsx), so the preview is a
 * faithful, 1:1 representation of a real slide.
 */

/** A self-contained SVG placeholder used where a slide would supply an image. */
export function placeholderImage(label = 'Your image'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b4a63"/><stop offset="1" stop-color="#1b2230"/>
    </linearGradient></defs>
    <rect width="640" height="640" fill="url(#g)"/>
    <g fill="none" stroke="#8ea3c4" stroke-width="14" stroke-linejoin="round" opacity="0.8">
      <circle cx="232" cy="220" r="54"/>
      <path d="M120 470 L268 312 L372 420 L452 336 L536 470 Z"/>
    </g>
    <text x="320" y="560" font-family="sans-serif" font-size="34" fill="#aebbd2" text-anchor="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22')}`;
}

const RICH_BODY = `
  <h1>Build your theme</h1>
  <p>This is a paragraph of body text with a <a href="#">link</a> to show link styling.</p>
  <ul>
    <li>First bullet point</li>
    <li>Second bullet point</li>
  </ul>
  <blockquote><p>A short, memorable quote lives here.</p></blockquote>
  <p>Inline <code>code</code> looks like this.</p>
`;

function contentInner(html: string): string {
  return `<div class="slide__content"><div class="slide__content__inner">${html}</div></div>`;
}

export function getSlideInner(layout: LayoutKey): string {
  switch (layout) {
    case 'intro':
      return contentInner(`
        <h1>Presentation title</h1>
        <p>An introductory subtitle or speaker name</p>
      `);

    case 'section':
      return contentInner(`
        <h1>Section title</h1>
        <h2>A supporting subtitle</h2>
        <p>Short context for this section</p>
      `);

    case 'quote':
      return contentInner(`
        <h1>"Design is not just what it looks like and feels like. Design is how it works."</h1>
        <p>— Steve Jobs</p>
      `);

    case 'image':
      return contentInner(`<h1>Caption over a background image</h1>`);

    case 'video':
      return `
        <div class="slide__video" aria-hidden="true" style="background-image:url('${placeholderImage('Background video')}');background-size:cover;background-position:center;"></div>
        ${contentInner(`<h1>Caption over a background video</h1>`)}
      `;

    case 'image-left':
      return `
        <div class="slide__image_left"></div>
        ${contentInner(`
          <h1>Image on the left</h1>
          <p>The text column sits beside the image.</p>
          <ul><li>Point one</li><li>Point two</li></ul>
        `)}
      `;

    case 'image-right':
      return `
        ${contentInner(`
          <h1>Image on the right</h1>
          <p>The text column sits beside the image.</p>
          <ul><li>Point one</li><li>Point two</li></ul>
        `)}
        <div class="slide__image_right"></div>
      `;

    case 'two-columns':
      return contentInner(`
        <div class="slide__left">
          <h1>Left column</h1>
          <ul><li>Item A</li><li>Item B</li></ul>
        </div>
        <div class="slide__right">
          <h1>Right column</h1>
          <ul><li>Item C</li><li>Item D</li></ul>
        </div>
      `);

    case 'default':
    default:
      return contentInner(RICH_BODY);
  }
}
