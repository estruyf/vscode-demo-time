import { htmlEncode } from '../src/utils/htmlEncode';
import { describe, it, expect } from '@jest/globals';

describe('htmlEncode', () => {
  it('escapes the HTML special characters', () => {
    expect(htmlEncode(`A["Tom & Jerry"] --> B['<b>Done</b>']`)).toBe(
      'A[&quot;Tom &amp; Jerry&quot;] --&gt; B[&#39;&lt;b&gt;Done&lt;/b&gt;&#39;]',
    );
  });

  it('returns an empty string for empty input', () => {
    expect(htmlEncode('')).toBe('');
  });
});
