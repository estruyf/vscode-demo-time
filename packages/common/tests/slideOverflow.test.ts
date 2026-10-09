import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  fitSlideContent,
  getSlideAutoFitScript,
  getSlideOverflowMessage,
  getSlideOverflowSize,
  hasSlideOverflow,
  isAutoFitEnabled,
} from '../src/utils/slideOverflow';
import { SlideMetadata } from '../src/models';

type Rect = { top: number; left: number; width: number; height: number };

interface FakeElement {
  children: FakeElement[];
  classList: { contains: (name: string) => boolean };
  style: {
    zoom?: string;
    setProperty: (name: string, value: string) => void;
    removeProperty: (name: string) => void;
  };
  offsetWidth: number;
  computed: {
    display: string;
    position: string;
    overflowX: string;
    overflowY: string;
    paddingTop?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    paddingRight?: string;
  };
  getBoundingClientRect: () => DOMRect;
}

/**
 * A minimal element with a fixed layout, or a layout that depends on the zoom of `zoomOf`.
 */
const element = (
  rect: Rect | ((zoom: number) => Rect),
  options: {
    children?: FakeElement[];
    className?: string;
    position?: string;
    overflow?: string;
    padding?: number;
    offsetWidth?: number;
    zoomOf?: () => FakeElement | undefined;
  } = {},
): FakeElement => {
  const el: FakeElement = {
    children: options.children || [],
    classList: { contains: (name) => (options.className || '').split(' ').includes(name) },
    style: {
      setProperty(name, value) {
        if (name === 'zoom') {
          el.style.zoom = value;
        }
      },
      removeProperty(name) {
        if (name === 'zoom') {
          el.style.zoom = undefined;
        }
      },
    },
    offsetWidth: options.offsetWidth ?? (typeof rect === 'function' ? rect(1).width : rect.width),
    computed: {
      display: 'block',
      position: options.position || 'static',
      overflowX: options.overflow || 'visible',
      overflowY: options.overflow || 'visible',
      ...(options.padding !== undefined
        ? {
            paddingTop: `${options.padding}px`,
            paddingBottom: `${options.padding}px`,
            paddingLeft: `${options.padding}px`,
            paddingRight: `${options.padding}px`,
          }
        : {}),
    },
    getBoundingClientRect: () => {
      const zoomEl = options.zoomOf?.();
      const zoom = zoomEl?.style.zoom ? parseFloat(zoomEl.style.zoom) : 1;
      const { top, left, width, height } = typeof rect === 'function' ? rect(zoom) : rect;
      return {
        top,
        left,
        width,
        height,
        bottom: top + height,
        right: left + width,
        x: left,
        y: top,
        toJSON: () => ({}),
      } as DOMRect;
    },
  };
  return el;
};

const SLIDE = { top: 0, left: 0, width: 960, height: 540 };

/**
 * A `.slide__content` box with an inner element and a block of content of the given height.
 */
const slideContent = (contentHeight: number, options: { scale?: number; top?: number } = {}) => {
  const scale = options.scale ?? 1;
  const contentTop = options.top ?? 32;
  let inner: FakeElement | undefined;
  const block = element(
    (zoom) => ({
      top: contentTop * zoom * scale,
      left: 32 * scale,
      width: 896 * scale,
      height: contentHeight * zoom * scale,
    }),
    { zoomOf: () => inner },
  );
  inner = element(
    { top: 0, left: 0, width: 960 * scale, height: 540 * scale },
    { className: 'slide__content__inner', children: [block], offsetWidth: 960, padding: 32 },
  );
  const box = element(
    { top: 0, left: 0, width: 960 * scale, height: 540 * scale },
    { children: [inner], overflow: 'hidden', offsetWidth: 960 },
  );
  return { box, inner: inner as FakeElement };
};

const originalGetComputedStyle = (globalThis as { getComputedStyle?: unknown }).getComputedStyle;

beforeAll(() => {
  (globalThis as { getComputedStyle?: unknown }).getComputedStyle = (el: FakeElement) =>
    el.computed;
});

afterAll(() => {
  (globalThis as { getComputedStyle?: unknown }).getComputedStyle = originalGetComputedStyle;
});

const fit = (box: FakeElement, autoFit = false) =>
  fitSlideContent(box as unknown as HTMLElement, autoFit);

describe('fitSlideContent', () => {
  it('returns no overflow when the content fits', () => {
    const { box } = slideContent(400);
    expect(fit(box)).toMatchObject({ overflow: { x: 0, y: 0 }, zoom: 1 });
  });

  it('measures the content below the slide', () => {
    // 32px from the top + 592px of content = 84px past the 540px slide
    const { box } = slideContent(592);
    expect(fit(box).overflow).toEqual({
      x: 0,
      y: 84,
      edges: { top: 0, right: 0, bottom: 84, left: 0 },
    });
  });

  it('measures in slide pixels when the preview scales the slide', () => {
    const { box } = slideContent(592, { scale: 0.5 });
    expect(fit(box).overflow).toMatchObject({ x: 0, y: 84 });
  });

  it('adds the overflow at the top of centered content', () => {
    const { box } = slideContent(640, { top: -50 });
    // 50px above and 50px below the slide
    expect(fit(box).overflow).toEqual({
      x: 0,
      y: 100,
      edges: { top: 50, right: 0, bottom: 50, left: 0 },
    });
  });

  it('ignores a difference of a pixel', () => {
    const { box } = slideContent(509);
    expect(fit(box).overflow).toMatchObject({ x: 0, y: 0 });
  });

  it('leaves out absolute positioned elements and content inside clipping elements', () => {
    const decoration = element(
      { top: -100, left: -100, width: 300, height: 300 },
      { position: 'absolute' },
    );
    const clipped = element({ top: 400, left: 32, width: 2000, height: 600 });
    const scroller = element(
      { top: 32, left: 32, width: 896, height: 400 },
      { overflow: 'auto', children: [clipped] },
    );
    const inner = element(SLIDE, {
      className: 'slide__content__inner',
      children: [decoration, scroller],
    });
    const box = element(SLIDE, { children: [inner], overflow: 'hidden' });

    expect(fit(box).overflow).toMatchObject({ x: 0, y: 0 });
  });

  it('measures content that is wider than the slide', () => {
    const wide = element({ top: 32, left: 32, width: 1000, height: 200 });
    const inner = element(SLIDE, { className: 'slide__content__inner', children: [wide] });
    const box = element(SLIDE, { children: [inner], overflow: 'hidden' });

    expect(fit(box).overflow).toEqual({
      x: 72,
      y: 0,
      edges: { top: 0, right: 72, bottom: 0, left: 0 },
    });
  });

  it('does not zoom without autoFit', () => {
    const { box, inner } = slideContent(592);
    expect(fit(box).zoom).toBe(1);
    expect(inner.style.zoom).toBeUndefined();
  });

  it('zooms out the content until it fits inside the padding with autoFit', () => {
    const { box, inner } = slideContent(592);
    const result = fit(box, true);

    expect(result.overflow).toMatchObject({ x: 0, y: 0 });
    // The content ends above the bottom padding: (32 + 592) * zoom <= 540 - 32 * zoom, with the
    // 1px tolerance
    expect(result.zoom).toBeGreaterThan(0.8);
    expect(result.zoom).toBeLessThanOrEqual(541.5 / 656);
    expect(inner.style.zoom).toBe(`${result.zoom}`);
  });

  it('measures from the full size again when the content was zoomed before', () => {
    const { box, inner } = slideContent(400);
    inner.style.setProperty('zoom', '0.6');

    expect(fit(box, true)).toMatchObject({ overflow: { x: 0, y: 0 }, zoom: 1 });
    expect(inner.style.zoom).toBeUndefined();
  });

  it('returns the remaining overflow when the content does not fit at 50%', () => {
    const { box } = slideContent(1500);
    const result = fit(box, true);

    expect(result.zoom).toBe(0.5);
    // (32 + 1500) * 0.5 - 540
    expect(result.overflow).toMatchObject({ x: 0, y: 226 });
  });
});

describe('getSlideAutoFitScript', () => {
  it('contains a self-contained copy of fitSlideContent', () => {
    const fitted: unknown[] = [];
    const script = getSlideAutoFitScript();
    const run = new Function('document', 'getComputedStyle', `return ${script};`);
    run(
      {
        querySelectorAll: (selector: string) => {
          expect(selector).toBe('.slide__content[data-autofit]');
          const { box, inner } = slideContent(592);
          fitted.push(inner);
          return [box];
        },
      },
      (el: FakeElement) => el.computed,
    );

    expect(fitted).toHaveLength(1);
    expect((fitted[0] as FakeElement).style.zoom).toBeDefined();
  });
});

describe('slide overflow helpers', () => {
  it('reads autoFit from the frontmatter', () => {
    expect(isAutoFitEnabled({ autoFit: true } as SlideMetadata)).toBe(true);
    expect(isAutoFitEnabled({ autoFit: 'true' } as unknown as SlideMetadata)).toBe(true);
    expect(isAutoFitEnabled({ autoFit: false } as SlideMetadata)).toBe(false);
    expect(isAutoFitEnabled({})).toBe(false);
    expect(isAutoFitEnabled(undefined)).toBe(false);
  });

  it('checks for overflow', () => {
    expect(hasSlideOverflow(undefined)).toBe(false);
    expect(hasSlideOverflow({ x: 0, y: 0 })).toBe(false);
    expect(hasSlideOverflow({ x: 0, y: 3 })).toBe(true);
  });

  it('describes the overflow', () => {
    expect(getSlideOverflowSize({ x: 0, y: 84 })).toBe('84px too tall');
    expect(getSlideOverflowSize({ x: 20, y: 0 })).toBe('20px too wide');
    expect(getSlideOverflowSize({ x: 20, y: 84 })).toBe('84px too tall and 20px too wide');
    expect(getSlideOverflowMessage({ x: 0, y: 84 })).toBe('The content is 84px too tall');
    expect(getSlideOverflowMessage({ x: 0, y: 84 }, true)).toBe(
      'The content is still 84px too tall with autoFit at 50%',
    );
  });
});
