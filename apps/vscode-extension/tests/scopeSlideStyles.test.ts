import { rebaseCssUrls, scopeSlideStyles } from '../src/utils/scopeSlideStyles';
import { describe, it, expect } from '@jest/globals';

describe('scopeSlideStyles', () => {
  it('scopes the style blocks to the slide', () => {
    const html = '<h1>Title</h1><style>p { color: red; }</style>';
    expect(scopeSlideStyles(html, '#slide-1')).toBe(
      '<h1>Title</h1><style type="text/tailwindcss">#slide-1 {p { color: red; }}</style>',
    );
  });

  it('decodes the entities that renderToString adds to the CSS', () => {
    const html =
      '<style>.a &gt; b::after { content: &quot;✓&quot;; font-family: &#x27;Mono&#x27;; } .c &amp; .d {}</style>';
    expect(scopeSlideStyles(html, '#slide-2')).toBe(
      `<style type="text/tailwindcss">#slide-2 {.a > b::after { content: "✓"; font-family: 'Mono'; } .c & .d {}}</style>`,
    );
  });

  it('handles multiple style blocks', () => {
    const html = '<style>a {}</style><p>x</p><style>b {}</style>';
    expect(scopeSlideStyles(html, '#s')).toBe(
      '<style type="text/tailwindcss">#s {a {}}</style><p>x</p><style type="text/tailwindcss">#s {b {}}</style>',
    );
  });
});

describe('rebaseCssUrls', () => {
  const themeUrl = 'file:///project/.demo/theme/theme.css';

  it('makes relative urls absolute to the stylesheet', () => {
    const css = `src: url("Font.ttf"); background: url('../assets/bg.png'), url(img.svg);`;
    expect(rebaseCssUrls(css, themeUrl)).toBe(
      `src: url("file:///project/.demo/theme/Font.ttf"); background: url("file:///project/.demo/assets/bg.png"), url("file:///project/.demo/theme/img.svg");`,
    );
  });

  it('leaves absolute, root relative, fragment and data urls alone', () => {
    const css = [
      `url("https://example.com/a.png")`,
      `url(/a.png)`,
      `url(#id)`,
      `url("data:image/svg+xml,%3Csvg filter='url(%23n)'%3E")`,
    ].join(' ');
    expect(rebaseCssUrls(css, themeUrl)).toBe(css);
  });
});
