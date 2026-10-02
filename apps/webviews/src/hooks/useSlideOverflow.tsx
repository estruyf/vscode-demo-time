import * as React from 'react';
import { fitSlideContent, SlideOverflow } from '@demotime/common';

const NO_OVERFLOW: SlideOverflow = { x: 0, y: 0 };

export interface SlideFit {
  /**
   * How far the content reaches past the slide, in slide pixels
   */
  overflow: SlideOverflow;
  /**
   * The zoom `autoFit` applied to the content, 1 when it isn't scaled
   */
  zoom: number;
  /**
   * Where the content area (`.slide__content`) is on the slide, in slide pixels. It is smaller
   * than the slide in layouts like `image-left`.
   */
  area?: { top: number; left: number; width: number; height: number };
}

const NO_FIT: SlideFit = { overflow: NO_OVERFLOW, zoom: 1 };
// Waits for a burst of DOM changes (markdown processing, click steps, ...) to settle
const MEASURE_DELAY = 50;

export interface UseSlideOverflowOptions {
  /**
   * Measures the slide. When off, the overflow is reset.
   */
  enabled: boolean;
  /**
   * Zooms out the content until it fits (`autoFit: true`)
   */
  autoFit: boolean;
  /**
   * Measures again when the key changes, like when another slide is shown
   */
  slideKey: string;
}

/**
 * Measures how far the content of the slide in `containerRef` reaches past the slide, and zooms
 * it out with `autoFit`. It measures again when the content changes, images or fonts load, or the
 * size of the content changes (like a click step that reveals more content).
 *
 * @returns The overflow in slide pixels and the zoom of `autoFit`
 */
export const useSlideOverflow = (
  containerRef: React.RefObject<HTMLElement | null>,
  { enabled, autoFit, slideKey }: UseSlideOverflowOptions,
): SlideFit => {
  const [fit, setFit] = React.useState<SlideFit>(NO_FIT);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) {
      // Remove the zoom of an earlier `autoFit`
      container
        ?.querySelectorAll<HTMLElement>('.slide__content > *')
        .forEach((element) => element.style.removeProperty('zoom'));
      setFit(NO_FIT);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const measure = () => {
      if (disposed) {
        return;
      }

      const box = container.querySelector<HTMLElement>('.slide__content');
      if (!box) {
        setFit(NO_FIT);
        return;
      }

      const { overflow, zoom } = fitSlideContent(box, autoFit);
      const containerRect = container.getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();
      const scale = container.offsetWidth ? containerRect.width / container.offsetWidth : 1;
      const area = {
        top: Math.round((boxRect.top - containerRect.top) / scale),
        left: Math.round((boxRect.left - containerRect.left) / scale),
        width: Math.round(boxRect.width / scale),
        height: Math.round(boxRect.height / scale),
      };
      const result: SlideFit = { overflow, zoom, area };
      // Only update when something changed, as every update renders the preview again
      setFit((prev) => (JSON.stringify(prev) === JSON.stringify(result) ? prev : result));
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(measure, MEASURE_DELAY);
    };

    // Content in shadow DOM (click steps, Mermaid) and fonts change the size of the blocks of the
    // slide without a DOM mutation. The zoom of `autoFit` also resizes them, but setting the same
    // zoom again doesn't, so this stops after one extra measurement.
    const resizeObserver = new ResizeObserver(schedule);
    const observeBlocks = () => {
      resizeObserver.disconnect();
      container
        .querySelectorAll('.slide__content > * > *')
        .forEach((block) => resizeObserver.observe(block));
    };

    // `style` is left out: `autoFit` sets the zoom with it
    const mutationObserver = new MutationObserver(() => {
      observeBlocks();
      schedule();
    });
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'src', 'hidden', 'open'],
    });

    // Images and videos (the `load` event doesn't bubble, so listen in the capture phase)
    container.addEventListener('load', schedule, true);
    // A slide transition (`zoomIn`, `rotateIn`, ...) transforms the slide while it animates
    container.addEventListener('animationend', schedule);
    document.fonts?.ready.then(schedule).catch(() => undefined);

    observeBlocks();
    schedule();

    return () => {
      disposed = true;
      clearTimeout(timer);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      container.removeEventListener('load', schedule, true);
      container.removeEventListener('animationend', schedule);
    };
  }, [containerRef, enabled, autoFit, slideKey]);

  return fit;
};
