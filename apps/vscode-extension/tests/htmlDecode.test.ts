import { htmlDecode } from '../src/utils/htmlDecode';
import { decode } from 'entities';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

beforeAll(() => {
  (global as any).document = {
    createElement: () => {
      return {
        _html: '',
        childNodes: [] as any[],
        set innerHTML(value: string) {
          this._html = value;
          this.childNodes = [{ textContent: decode(value) }];
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

  it('returns undefined for empty input', () => {
    expect(htmlDecode('')).toBeUndefined();
  });
});
