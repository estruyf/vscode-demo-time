import { SlideMetadata, SlideOverflow } from '../models';
import { toBoolean } from './toBoolean';

/**
 * The attribute that marks the `.slide__content` element of a slide with `autoFit: true` in
 * rendered HTML, like the PDF export.
 */
export const AUTO_FIT_ATTRIBUTE = 'data-autofit';

/**
 * The attribute an animation component (like `fade-in`) sets while its content moves. The overflow
 * check counts the box of that element, which is where its content ends up, and not the content
 * itself.
 */
export const SLIDE_ANIMATING_ATTRIBUTE = 'data-demotime-animating';

/**
 * Returns whether the slide has `autoFit: true` in its frontmatter.
 */
export const isAutoFitEnabled = (frontmatter?: SlideMetadata): boolean =>
  toBoolean(frontmatter?.autoFit) === true;

/**
 * Returns whether the content reaches past the slide.
 */
export const hasSlideOverflow = (overflow?: SlideOverflow): overflow is SlideOverflow =>
  !!overflow && (overflow.x > 0 || overflow.y > 0);

/**
 * The smallest zoom `autoFit` scales the content down to.
 */
export const AUTO_FIT_MIN_ZOOM = 0.5;

/**
 * Describes how much the content is too big, like "84px too tall" or "84px too tall and 20px too
 * wide".
 */
export const getSlideOverflowSize = (overflow: SlideOverflow): string =>
  [
    overflow.y > 0 ? `${overflow.y}px too tall` : undefined,
    overflow.x > 0 ? `${overflow.x}px too wide` : undefined,
  ]
    .filter(Boolean)
    .join(' and ');

/**
 * Describes the overflow in a sentence, like "The content is 84px too tall". With `autoFit`, the
 * content is already at its smallest size.
 */
export const getSlideOverflowMessage = (overflow: SlideOverflow, autoFit = false): string =>
  autoFit
    ? `The content is still ${getSlideOverflowSize(overflow)} with autoFit at ${AUTO_FIT_MIN_ZOOM * 100}%`
    : `The content is ${getSlideOverflowSize(overflow)}`;

/**
 * Measures how far the content of a slide reaches past its `.slide__content` element, and with
 * `autoFit`, zooms the content out until it fits.
 *
 * - Absolute and fixed positioned elements (decorations, background videos) are left out.
 * - Content inside an element that clips or scrolls only counts up to the edges of that element.
 * - Content of an animation that is still moving (`data-demotime-animating`) counts at the box of
 *   the animation element, which is where it ends up.
 * - `autoFit` sets the CSS `zoom` of the `.slide__content__inner` or `.slide__content__custom`
 *   element, so the text reflows at the smaller size, down to 50%. The zoomed content keeps the
 *   padding of that element as a margin. When the content doesn't fit at 50%, the remaining
 *   overflow is returned.
 *
 * The function doesn't use anything outside its body, so the PDF export can run it in the browser
 * page from its source (see `getSlideAutoFitScript`).
 *
 * @param box The `.slide__content` element
 * @param autoFit Whether to zoom out the content until it fits
 * @returns The overflow in slide pixels and the applied zoom
 */
export function fitSlideContent(
  box: HTMLElement,
  autoFit = false,
): { overflow: SlideOverflow; zoom: number } {
  // AUTO_FIT_MIN_ZOOM, inside the function so the PDF export can run it from its source
  const MIN_ZOOM = 0.5;
  const SEARCH_STEPS = 8;
  // Ignores subpixel differences from rounding and transforms
  const TOLERANCE = 1;
  // SLIDE_ANIMATING_ATTRIBUTE, inside the function so the PDF export can run it from its source
  const ANIMATING_ATTRIBUTE = 'data-demotime-animating';

  /**
   * @param padding The element whose padding the content has to stay inside, at the given zoom
   */
  const measure = (padding?: { element: HTMLElement; zoom: number }): SlideOverflow => {
    const boxRect = box.getBoundingClientRect();
    if (!boxRect.width || !boxRect.height || !box.offsetWidth) {
      return { x: 0, y: 0, edges: { top: 0, right: 0, bottom: 0, left: 0 } };
    }

    // The preview scales the slide with a transform, the overflow is in slide pixels
    const scale = boxRect.width / box.offsetWidth;
    const bounds = {
      top: boxRect.top,
      bottom: boxRect.bottom,
      left: boxRect.left,
      right: boxRect.right,
    };
    if (padding) {
      // The computed padding is the value before the zoom
      const style = getComputedStyle(padding.element);
      const factor = padding.zoom * scale;
      bounds.top += (parseFloat(style.paddingTop) || 0) * factor;
      bounds.bottom -= (parseFloat(style.paddingBottom) || 0) * factor;
      bounds.left += (parseFloat(style.paddingLeft) || 0) * factor;
      bounds.right -= (parseFloat(style.paddingRight) || 0) * factor;
    }

    let top = bounds.top;
    let bottom = bounds.bottom;
    let left = bounds.left;
    let right = bounds.right;

    const walk = (parent: Element) => {
      for (const child of Array.from(parent.children)) {
        const style = getComputedStyle(child);
        if (
          style.display === 'none' ||
          style.position === 'absolute' ||
          style.position === 'fixed'
        ) {
          continue;
        }

        const rect = child.getBoundingClientRect();
        // The element with the padding fills the slide, only its content counts
        if (child !== padding?.element && (rect.width > 0 || rect.height > 0)) {
          top = Math.min(top, rect.top);
          bottom = Math.max(bottom, rect.bottom);
          left = Math.min(left, rect.left);
          right = Math.max(right, rect.right);
        }

        if (
          style.overflowX === 'visible' &&
          style.overflowY === 'visible' &&
          !child.hasAttribute(ANIMATING_ATTRIBUTE)
        ) {
          walk(child);
        }
      }
    };
    walk(box);

    const toSlidePixels = (value: number) => {
      const px = Math.round(value / scale);
      return px > TOLERANCE ? px : 0;
    };

    const edges = {
      top: Math.max(0, bounds.top - top),
      right: Math.max(0, right - bounds.right),
      bottom: Math.max(0, bottom - bounds.bottom),
      left: Math.max(0, bounds.left - left),
    };

    return {
      x: toSlidePixels(edges.left + edges.right),
      y: toSlidePixels(edges.top + edges.bottom),
      edges: {
        top: toSlidePixels(edges.top),
        right: toSlidePixels(edges.right),
        bottom: toSlidePixels(edges.bottom),
        left: toSlidePixels(edges.left),
      },
    };
  };

  const fits = (overflow: SlideOverflow) => overflow.x === 0 && overflow.y === 0;

  const target = Array.from(box.children).find(
    (child) =>
      child.classList.contains('slide__content__inner') ||
      child.classList.contains('slide__content__custom'),
  ) as HTMLElement | undefined;

  // Measure the content at its full size
  target?.style.removeProperty('zoom');
  const overflow = measure();
  if (!autoFit || !target || fits(overflow)) {
    return { overflow, zoom: 1 };
  }

  const setZoom = (zoom: number) => target.style.setProperty('zoom', `${zoom}`);

  // Zooms out the content and checks if it fits inside the padding
  const fitsAt = (zoom: number) => {
    setZoom(zoom);
    return fits(measure({ element: target, zoom }));
  };

  if (!fitsAt(MIN_ZOOM)) {
    // The content keeps the smallest zoom, the overflow is the part that is cut off
    return { overflow: measure(), zoom: MIN_ZOOM };
  }

  // The largest zoom at which the content fits. The text reflows, so the height doesn't scale
  // linearly with the zoom.
  let low = MIN_ZOOM;
  let high = 1;
  for (let step = 0; step < SEARCH_STEPS; step++) {
    const zoom = (low + high) / 2;
    if (fitsAt(zoom)) {
      low = zoom;
    } else {
      high = zoom;
    }
  }

  const zoom = Math.floor(low * 1000) / 1000;
  setZoom(zoom);
  return { overflow: measure(), zoom };
}

/**
 * A script for a browser page (PDF export, slide screenshots) that fits the content of every slide
 * marked with the `data-autofit` attribute.
 *
 * A bundler that keeps function names (esbuild `keepNames`) wraps the inner functions in a
 * `__name` helper, which the page gets as a no-op. When the script fails anyway, the slides keep
 * their size instead of breaking the export.
 */
export const getSlideAutoFitScript = (): string =>
  `(() => {
  try {
    const __name = (target) => target;
    const fitSlideContent = ${fitSlideContent.toString()};
    document.querySelectorAll('.slide__content[${AUTO_FIT_ATTRIBUTE}]').forEach((box) => fitSlideContent(box, true));
  } catch (error) {
    console.error('Demo Time: autoFit failed', error);
  }
})()`;
