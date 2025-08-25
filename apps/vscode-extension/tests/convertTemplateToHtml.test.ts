import { convertTemplateToHtml } from '../src/utils/convertTemplateToHtml';
import { describe, it, expect } from '@jest/globals';

describe('convertTemplateToHtml', () => {
  it('replaces image src when webviewUrl is provided', () => {
    const template = '<img src="images/pic.png">';
    const html = convertTemplateToHtml(template, {}, 'https://webview/');
    expect(html).toBe('<img src="https://webview/images/pic.png">');
  });

  it('does not modify absolute urls', () => {
    const template = '<img src="https://example.com/a.png">';
    const html = convertTemplateToHtml(template, {}, 'https://webview/');
    expect(html).toBe(template);
  });
});
