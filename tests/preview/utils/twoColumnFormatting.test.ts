import { twoColumnFormatting } from '../../../src/preview/utils/twoColumnFormatting';

describe('twoColumnFormatting', () => {
  test('should return empty string if content is empty', () => {
    expect(twoColumnFormatting('')).toBe('');
  });

  test('should return original content if "::right::" is not present', () => {
    const content = 'This is a single column content.';
    expect(twoColumnFormatting(content)).toBe(content);
  });

  test('should format content into two columns if "::right::" is present once', () => {
    const content = 'Left side content::right::Right side content';
    const expectedOutput = `
<div class="slide__left">

Left side content

</div>
<div class="slide__right">

Right side content

</div>`;
    expect(twoColumnFormatting(content)).toBe(expectedOutput);
  });

  test('should return original content if "::right::" is present multiple times', () => {
    const content = 'Left::right::Center::right::Right';
    expect(twoColumnFormatting(content)).toBe(content);
  });

  test('should format content correctly with whitespace around "::right::"', () => {
    const content = 'Left side content  ::right::  Right side content';
    const expectedOutput = `
<div class="slide__left">

Left side content

</div>
<div class="slide__right">

Right side content

</div>`;
    // The implementation currently splits by "::right::" then trims.
    // If the intention was to trim the separator itself, the implementation would need to change.
    // For now, testing current behavior.
    // If split was `content.split(/\s*::right::\s*/)` this test would be different.
    // Current implementation:
    // const rightSplit = content.split("::right::"); -> ['Left side content  ', '  Right side content']
    // const left = rightSplit[0].trim(); -> 'Left side content'
    // const right = rightSplit[1].trim(); -> 'Right side content'
    expect(twoColumnFormatting(content)).toBe(expectedOutput);
  });

  test('should format content correctly with leading/trailing whitespace in parts', () => {
    const content = '  Left side content with spaces  ::right::  Right side content with spaces  ';
    const expectedOutput = `
<div class="slide__left">

Left side content with spaces

</div>
<div class="slide__right">

Right side content with spaces

</div>`;
    expect(twoColumnFormatting(content)).toBe(expectedOutput);
  });

  test('should handle content with only "::right::"', () => {
    const content = '::right::';
    const expectedOutput = `
<div class="slide__left">



</div>
<div class="slide__right">



</div>`;
    expect(twoColumnFormatting(content)).toBe(expectedOutput);
  });

  test('should handle content with left side empty', () => {
    const content = '::right::Right side only';
    const expectedOutput = `
<div class="slide__left">



</div>
<div class="slide__right">

Right side only

</div>`;
    expect(twoColumnFormatting(content)).toBe(expectedOutput);
  });

  test('should handle content with right side empty', () => {
    const content = 'Left side only::right::';
    const expectedOutput = `
<div class="slide__left">

Left side only

</div>
<div class="slide__right">



</div>`;
    expect(twoColumnFormatting(content)).toBe(expectedOutput);
  });
});
