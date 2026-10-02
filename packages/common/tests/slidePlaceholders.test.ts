import { describe, it, expect } from '@jest/globals';
import {
  getProgressBarPosition,
  getProgressPercentage,
  getSlideHeading,
  getTemplateData,
  renderProgressBar,
} from '../src/utils/slidePlaceholders';
import { formatDate, toDate } from '../src/utils/formatDate';
import { convertTemplateToHtml } from '../src/utils/convertTemplateToHtml';

describe('getSlideHeading', () => {
  it('returns the first H1', () => {
    expect(getSlideHeading('## Intro\n\n# Main title\n\nText')).toBe('Main title');
  });

  it('falls back to the first heading of any level', () => {
    expect(getSlideHeading('Text\n\n## Sub title\n\n### Other')).toBe('Sub title');
  });

  it('skips headings in code blocks', () => {
    expect(getSlideHeading('```md\n# Not this\n```\n\n# This one')).toBe('This one');
    expect(getSlideHeading('~~~\n# Not this\n~~~\n\n## This one')).toBe('This one');
  });

  it('removes inline markdown', () => {
    expect(getSlideHeading('# **Demo** `Time` [docs](https://demotime.show)')).toBe(
      'Demo Time docs',
    );
  });

  it('returns undefined without a heading', () => {
    expect(getSlideHeading('Just text')).toBeUndefined();
    expect(getSlideHeading(undefined)).toBeUndefined();
  });
});

describe('getTemplateData', () => {
  it('adds the placeholders to the front matter', () => {
    const data = getTemplateData(
      { name: 'Elio' },
      { crntSlideIdx: 2, totalSlides: 10, actTitle: 'Act 1', sceneTitle: 'Scene 1' },
    );
    expect(data).toMatchObject({
      name: 'Elio',
      crntSlideIdx: 2,
      totalSlides: 10,
      actTitle: 'Act 1',
      sceneTitle: 'Scene 1',
    });
  });

  it('keeps front matter values for the text placeholders', () => {
    const data = getTemplateData(
      { slideTitle: 'Custom', crntSlideIdx: 99 },
      { slideTitle: 'Heading', crntSlideIdx: 3 },
    );
    expect(data.slideTitle).toBe('Custom');
    expect(data.crntSlideIdx).toBe(3);
  });

  it('does not change the front matter', () => {
    const frontmatter = { title: 'Slide' };
    getTemplateData(frontmatter, { crntSlideIdx: 1 });
    expect(frontmatter).toEqual({ title: 'Slide' });
  });
});

describe('getProgressBarPosition', () => {
  it('uses the setting', () => {
    expect(getProgressBarPosition('top', undefined)).toBe('top');
    expect(getProgressBarPosition('bottom', undefined)).toBe('bottom');
    expect(getProgressBarPosition('none', undefined)).toBeUndefined();
    expect(getProgressBarPosition(undefined, undefined)).toBeUndefined();
  });

  it('lets the front matter turn it off', () => {
    expect(getProgressBarPosition('top', false)).toBeUndefined();
    expect(getProgressBarPosition('top', 'false')).toBeUndefined();
  });

  it('lets the front matter turn it on', () => {
    expect(getProgressBarPosition('none', true)).toBe('bottom');
    expect(getProgressBarPosition('top', true)).toBe('top');
  });

  it('lets the front matter set the position', () => {
    expect(getProgressBarPosition('none', 'top')).toBe('top');
    expect(getProgressBarPosition('top', 'bottom')).toBe('bottom');
  });
});

describe('getProgressPercentage', () => {
  it('calculates the percentage', () => {
    expect(getProgressPercentage(1, 4)).toBe(25);
    expect(getProgressPercentage(4, 4)).toBe(100);
  });

  it('returns undefined without a slide number', () => {
    expect(getProgressPercentage(null, 4)).toBeUndefined();
    expect(getProgressPercentage(1, 0)).toBeUndefined();
  });
});

describe('renderProgressBar', () => {
  it('renders the bar', () => {
    const html = renderProgressBar('bottom', 1, 2);
    expect(html).toContain('slide__progress--bottom');
    expect(html).toContain('width: 50%;');
  });

  it('renders nothing without a position or slide number', () => {
    expect(renderProgressBar(undefined, 1, 2)).toBe('');
    expect(renderProgressBar('top', null, 2)).toBe('');
  });
});

describe('formatDate', () => {
  const date = new Date(2026, 9, 1, 14, 5, 9);

  it('formats numeric tokens', () => {
    expect(formatDate(date, 'yyyy-MM-dd HH:mm:ss')).toBe('2026-10-01 14:05:09');
    expect(formatDate(date, 'd/M/yy h:m a')).toBe('1/10/26 2:5 PM');
  });

  it('formats month and day names', () => {
    expect(formatDate(date, 'd MMM yyyy', 'en-US')).toBe('1 Oct 2026');
    expect(formatDate(date, 'EEEE, MMMM d', 'en-US')).toBe('Thursday, October 1');
  });

  it('keeps quoted text', () => {
    expect(formatDate(date, "'Today is' d MMM", 'en-US')).toBe('Today is 1 Oct');
  });
});

describe('toDate', () => {
  it('reads date-only strings as local dates', () => {
    const date = toDate('2026-10-01');
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(9);
    expect(date?.getDate()).toBe(1);
  });

  it('keeps the day of YAML dates', () => {
    const date = toDate(new Date(Date.UTC(2026, 9, 1)));
    expect(date?.getDate()).toBe(1);
  });

  it('returns undefined for invalid values', () => {
    expect(toDate('not a date')).toBeUndefined();
    expect(toDate(42)).toBeUndefined();
  });
});

describe('date helper', () => {
  it('returns the date front matter as is without a format', () => {
    expect(convertTemplateToHtml('{{date}}', { date: 'June 16th' })).toBe('June 16th');
  });

  it('shows an unquoted YAML date the way it was written', () => {
    expect(convertTemplateToHtml('{{date}}', { date: new Date(Date.UTC(2025, 5, 16)) })).toBe(
      '2025-06-16',
    );
  });

  it('formats the date front matter', () => {
    expect(convertTemplateToHtml('{{date "yyyy/MM/dd"}}', { date: '2025-06-16' })).toBe(
      '2025/06/16',
    );
  });

  it("formats today's date without a date front matter", () => {
    const expected = formatDate(new Date(), 'yyyy-MM-dd');
    expect(convertTemplateToHtml('{{date "yyyy-MM-dd"}}', {})).toBe(expected);
  });

  it("renders today's date without a format", () => {
    expect(convertTemplateToHtml('{{date}}', {})).not.toBe('');
  });
});
