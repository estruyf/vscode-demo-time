import { renderTemplateError, tryConvertTemplateToHtml } from '../src/utils/templateError';
import { describe, it, expect } from '@jest/globals';

describe('tryConvertTemplateToHtml', () => {
  it('returns the rendered html for a valid template', () => {
    const result = tryConvertTemplateToHtml(
      '<h1>{{metadata.title}}</h1>',
      { metadata: { title: 'Hi' } },
      {
        title: 'Custom layout error',
        path: './layouts/valid.hbs',
      },
    );
    expect(result).toEqual({ html: '<h1>Hi</h1>' });
  });

  it('returns an error block for an invalid template instead of throwing', () => {
    const result = tryConvertTemplateToHtml(
      '{{#if metadata.title}}<h1>Hi</h1>',
      { metadata: {} },
      {
        title: 'Custom layout error',
        path: './layouts/broken.hbs',
      },
    );

    expect(result.error).toMatch(/^Custom layout error \(\.\/layouts\/broken\.hbs\): /);
    expect(result.error).toContain('Parse error');
    expect(result.html).toContain('demotime__template-error');
    expect(result.html).toContain('./layouts/broken.hbs');
  });
});

describe('renderTemplateError', () => {
  it('escapes the path and message', () => {
    const html = renderTemplateError(
      { title: 'Error', path: '<b>.hbs' },
      '<script>alert(1)</script>',
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;.hbs');
  });

  it('renders a single line in compact mode', () => {
    const html = renderTemplateError({ title: 'Header template error', compact: true }, 'Oops');
    expect(html).toContain('Header template error: Oops');
    expect(html).not.toContain('<pre');
  });
});
