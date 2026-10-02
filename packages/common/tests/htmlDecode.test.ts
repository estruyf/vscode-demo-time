import { htmlDecode } from '../src/utils/htmlDecode';
import { decode } from 'entities';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

beforeAll(() => {
  (global as any).document = {
    createElement: () => {
      return {
        value: '',
        set innerHTML(html: string) {
          this.value = decode(html);
        },
      };
    },
  };
});

afterAll(() => {
  delete (global as any).document;
});

describe('htmlDecode', () => {
  it('decodes basic HTML entities', () => {
    expect(htmlDecode('&amp;')).toBe('&');
  });

  it('keeps tags as text', () => {
    expect(htmlDecode('A[&quot;a<br/>b&quot;] --&gt; B')).toBe('A["a<br/>b"] --> B');
  });

  it('returns undefined for empty input', () => {
    expect(htmlDecode('')).toBeUndefined();
  });
});
