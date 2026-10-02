import {
  getSlidePropertyAtLine,
  getSlidePropertyCompletions,
} from '../src/utils/getSlidePropertyCompletions';

const lines = `---
theme: frost
---

# One

---
layout: video
vid
controls:
custom:
  nested
---

# Two`.split('\n');

const getKeys = (line: number, character = 0) => {
  const completions = getSlidePropertyCompletions(lines, line, character);
  return completions?.type === 'key' ? completions.suggestions : [];
};

describe('getSlidePropertyCompletions', () => {
  it('suggests the properties the front matter block of the slide does not set', () => {
    const keys = getKeys(8, 3).map((suggestion) => suggestion.key);

    expect(keys).toContain('video');
    expect(keys).toContain('theme');
    expect(keys).toContain('svgFile');
    expect(keys).not.toContain('layout');
    expect(keys).not.toContain('controls');
    // Aliases are not suggested
    expect(keys).not.toContain('autoPlay');
  });

  it('only looks at the front matter of the slide the cursor is in', () => {
    const keys = getKeys(1).map((suggestion) => suggestion.key);

    expect(keys).toContain('layout');
    expect(keys).toContain('controls');
  });

  it('sorts the properties of the layout of the slide first', () => {
    const groups = Object.fromEntries(
      getKeys(8, 3).map((suggestion) => [suggestion.key, suggestion.sortGroup]),
    );

    expect(groups.video).toBe(0);
    expect(groups.autoplay).toBe(0);
    expect(groups.transition).toBe(1);
    expect(groups.svgFile).toBe(2);
  });

  it('suggests the values of a property', () => {
    expect(getSlidePropertyCompletions(['---', 'layout: ', '---'], 1, 8)).toMatchObject({
      type: 'value',
      key: 'layout',
      values: expect.arrayContaining(['default', 'video', 'animated']),
    });
    expect(getSlidePropertyCompletions(lines, 9, 10)).toMatchObject({
      type: 'value',
      key: 'controls',
      values: ['true', 'false'],
    });
    expect(getSlidePropertyCompletions(['---', 'controlsPosition: ', '---'], 1, 18)).toMatchObject({
      values: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'none'],
    });
  });

  it('suggests nothing outside of the front matter, in nested values or for unknown properties', () => {
    expect(getSlidePropertyCompletions(lines, 4, 0)).toBeUndefined();
    expect(getSlidePropertyCompletions(lines, 11, 4)).toBeUndefined();
    expect(getSlidePropertyCompletions(['---', 'speaker: ', '---'], 1, 9)).toBeUndefined();
  });
});

describe('getSlidePropertyAtLine', () => {
  it('finds the property of a front matter line', () => {
    expect(getSlidePropertyAtLine(lines, 7)).toMatchObject({ key: 'layout', start: 0, end: 6 });
    expect(getSlidePropertyAtLine(['---', '"theme": frost', '---'], 1)).toMatchObject({
      key: 'theme',
      start: 1,
      end: 6,
    });
  });

  it('ignores unknown properties and lines outside of the front matter', () => {
    expect(getSlidePropertyAtLine(lines, 10)).toBeUndefined();
    expect(getSlidePropertyAtLine(lines, 4)).toBeUndefined();
    expect(getSlidePropertyAtLine(['---', 'toString: x', '---'], 1)).toBeUndefined();
  });
});
