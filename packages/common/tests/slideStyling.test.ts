import { describe, it, expect } from '@jest/globals';
import {
  getSlideBackgroundStyles,
  getSlideClassNames,
  isSlideBackgroundImage,
  toStyleAttribute,
} from '../src/utils/slideStyling';
import { SlideParser } from '../src/services/SlideParser';
import { SlideMetadata } from '../src/models';

const IMAGE_STYLES = {
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
};

describe('getSlideClassNames', () => {
  it('splits the classes on spaces', () => {
    expect(getSlideClassNames({ class: 'section-break  dark' })).toBe('section-break dark');
  });

  it('accepts a list and removes duplicates', () => {
    expect(getSlideClassNames({ class: ['one', 'two one'] } as unknown as SlideMetadata)).toBe(
      'one two',
    );
  });

  it('leaves out values that are not a class name', () => {
    expect(getSlideClassNames({ class: 'ok "><script> 1bad _good' })).toBe('ok _good');
    expect(getSlideClassNames({ class: 42 } as unknown as SlideMetadata)).toBe('');
    expect(getSlideClassNames(undefined)).toBe('');
  });
});

describe('isSlideBackgroundImage', () => {
  it('detects image paths and URLs', () => {
    expect(isSlideBackgroundImage('.demo/assets/bg.png')).toBe(true);
    expect(isSlideBackgroundImage('/assets/bg')).toBe(true);
    expect(isSlideBackgroundImage('./bg.webp?v=1')).toBe(true);
    expect(isSlideBackgroundImage('https://example.com/bg')).toBe(true);
    expect(isSlideBackgroundImage('data:image/png;base64,abc=')).toBe(true);
  });

  it('detects colours and gradients', () => {
    expect(isSlideBackgroundImage('#1e3a8a')).toBe(false);
    expect(isSlideBackgroundImage('navy')).toBe(false);
    expect(isSlideBackgroundImage('rgb(30, 58, 138)')).toBe(false);
    expect(isSlideBackgroundImage('linear-gradient(135deg, #1e3a8a, #9333ea)')).toBe(false);
    expect(isSlideBackgroundImage('url(https://example.com/bg.png) center / cover')).toBe(false);
  });
});

describe('getSlideBackgroundStyles', () => {
  it('uses a colour or gradient as the background', () => {
    expect(getSlideBackgroundStyles({ background: ' #1e3a8a ' })).toEqual({
      background: '#1e3a8a',
    });
    expect(getSlideBackgroundStyles({ background: 'linear-gradient(red, blue)' })).toEqual({
      background: 'linear-gradient(red, blue)',
    });
  });

  it('resolves the path of an image', () => {
    expect(
      getSlideBackgroundStyles(
        { background: '.demo/assets/bg.png' },
        (path) => `https://webview/${path}`,
      ),
    ).toEqual({ backgroundImage: 'url("https://webview/.demo/assets/bg.png")', ...IMAGE_STYLES });
  });

  it('does not resolve an image URL', () => {
    expect(
      getSlideBackgroundStyles(
        { background: 'https://example.com/bg.png' },
        (path) => `https://webview/${path}`,
      ),
    ).toEqual({ backgroundImage: 'url("https://example.com/bg.png")', ...IMAGE_STYLES });
  });

  it('lets an image that is the background take precedence', () => {
    expect(getSlideBackgroundStyles({ background: 'navy', image: 'bg.png' })).toBeUndefined();
    expect(
      getSlideBackgroundStyles({
        background: 'navy',
        image: 'bg.png',
        layout: 'image-left',
      } as SlideMetadata),
    ).toEqual({ background: 'navy' });
  });

  it('has no styles without a background', () => {
    expect(getSlideBackgroundStyles({})).toBeUndefined();
    expect(getSlideBackgroundStyles({ background: '  ' })).toBeUndefined();
    expect(getSlideBackgroundStyles(undefined)).toBeUndefined();
  });
});

describe('toStyleAttribute', () => {
  it('turns the styles into an encoded style attribute', () => {
    expect(
      toStyleAttribute(getSlideBackgroundStyles({ background: 'https://example.com/a.png' })),
    ).toBe(
      'background-image: url(&quot;https://example.com/a.png&quot;); background-repeat: no-repeat; background-size: cover; background-position: center center;',
    );
    expect(toStyleAttribute({ background: '"><script>' })).toBe(
      'background: &quot;&gt;&lt;script&gt;;',
    );
    expect(toStyleAttribute(undefined)).toBe('');
  });
});

describe('document front matter', () => {
  it('uses the background and class of the document front matter as a fallback', () => {
    const slides = new SlideParser().parseSlides(`---
background: "#1e3a8a"
class: deck
---

# One

---
class: section-break
---

# Two`);

    expect(slides[0].frontmatter.background).toBe('#1e3a8a');
    expect(getSlideClassNames(slides[0].frontmatter)).toBe('deck');
    expect(slides[1].frontmatter.background).toBe('#1e3a8a');
    expect(getSlideClassNames(slides[1].frontmatter)).toBe('section-break');
  });
});
