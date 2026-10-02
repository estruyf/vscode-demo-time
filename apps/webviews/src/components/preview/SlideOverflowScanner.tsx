import * as React from 'react';
import {
  fitSlideContent,
  isAutoFitEnabled,
  Slide,
  SlideLayout,
  SlideOverflow,
  SlideTheme,
} from '@demotime/common';
import { Markdown } from './Markdown';

export interface ISlideOverflowScannerProps {
  slides: Slide[];
  filePath?: string;
  vsCodeTheme: never;
  isDarkTheme: boolean;
  webviewUrl: string | null;
  /**
   * Gets the overflow of every slide once all slides are measured
   */
  onScanned: (overflows: SlideOverflow[]) => void;
}

const NO_OVERFLOW: SlideOverflow = { x: 0, y: 0 };
// Waits for the slide that is on screen to render first
const START_DELAY = 1000;
const CHECK_INTERVAL = 100;
// Checks in a row with the same layout before the slide is measured
const STABLE_CHECKS = 3;
// Markdown is processed after the first render, so an empty slide gets some time to fill
const CONTENT_TIMEOUT = 1000;
const MAX_WAIT = 5000;
const noop = () => {};

// Measurements of slides that didn't change, shared by all files of the preview
const cache = new Map<string, SlideOverflow>();

const getCacheKey = (slide: Slide) =>
  JSON.stringify({ content: slide.content, frontmatter: slide.frontmatter });

/**
 * Slides that are measured without rendering them: there is no content to overflow.
 */
const needsRendering = (slide: Slide) =>
  !!slide.content.trim() && slide.frontmatter.layout !== SlideLayout.AnimatedSVG;

/**
 * Renders the slides of a file one by one outside the view, to measure which slides have content
 * that overflows the slide. Click steps show their final state, and a background video isn't
 * loaded.
 */
export const SlideOverflowScanner: React.FunctionComponent<ISlideOverflowScannerProps> = ({
  slides,
  filePath,
  vsCodeTheme,
  isDarkTheme,
  webviewUrl,
  onScanned,
}: ISlideOverflowScannerProps) => {
  const [crntIdx, setCrntIdx] = React.useState<number | undefined>(undefined);
  const resultsRef = React.useRef<SlideOverflow[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const onScannedRef = React.useRef(onScanned);
  onScannedRef.current = onScanned;

  /**
   * The next slide to measure from `fromIdx`, after taking the slides that are cached or have
   * nothing to measure
   */
  const getNextIdx = React.useCallback(
    (fromIdx: number): number | undefined => {
      for (let idx = fromIdx; idx < slides.length; idx++) {
        const slide = slides[idx];
        const cached = cache.get(getCacheKey(slide));
        if (cached) {
          resultsRef.current[idx] = cached;
        } else if (!needsRendering(slide)) {
          resultsRef.current[idx] = NO_OVERFLOW;
        } else {
          return idx;
        }
      }
      return undefined;
    },
    [slides],
  );

  const moveTo = React.useCallback(
    (fromIdx: number) => {
      const nextIdx = getNextIdx(fromIdx);
      setCrntIdx(nextIdx);
      if (nextIdx === undefined) {
        onScannedRef.current([...resultsRef.current]);
      }
    },
    [getNextIdx],
  );

  // Starts again when the slides change
  React.useEffect(() => {
    resultsRef.current = new Array(slides.length).fill(NO_OVERFLOW);
    setCrntIdx(undefined);
    if (slides.length === 0) {
      return;
    }

    const timer = setTimeout(() => moveTo(0), START_DELAY);
    return () => clearTimeout(timer);
  }, [slides, moveTo]);

  // Measures the slide once its layout stops changing
  React.useEffect(() => {
    if (crntIdx === undefined) {
      return;
    }

    const slide = slides[crntIdx];
    let elapsed = 0;
    let stableChecks = 0;
    let lastSignature = '';

    const interval = setInterval(() => {
      elapsed += CHECK_INTERVAL;
      const container = containerRef.current;
      const box = container?.querySelector<HTMLElement>('.slide__content');
      const target = box?.querySelector('.slide__content__inner, .slide__content__custom');
      const hasContent = !!target && (target.childElementCount > 0 || elapsed >= CONTENT_TIMEOUT);
      const imagesLoaded = Array.from(container?.querySelectorAll('img') || []).every(
        (img) => img.complete,
      );
      const signature = box
        ? `${box.scrollWidth}x${box.scrollHeight}:${box.querySelectorAll('*').length}`
        : '';

      stableChecks =
        hasContent && imagesLoaded && signature === lastSignature ? stableChecks + 1 : 0;
      lastSignature = signature;

      if (stableChecks < STABLE_CHECKS && elapsed < MAX_WAIT) {
        return;
      }

      clearInterval(interval);
      const overflow = box
        ? fitSlideContent(box, isAutoFitEnabled(slide.frontmatter)).overflow
        : NO_OVERFLOW;
      cache.set(getCacheKey(slide), overflow);
      resultsRef.current[crntIdx] = overflow;
      moveTo(crntIdx + 1);
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [crntIdx, slides, moveTo]);

  const slide = crntIdx !== undefined ? slides[crntIdx] : undefined;
  if (!slide || !vsCodeTheme) {
    return null;
  }

  const layout = slide.frontmatter.layout || SlideLayout.Default;
  // Without the video, the slide doesn't load and play it
  const matter = { ...slide.frontmatter, video: undefined };

  return (
    <div
      ref={containerRef}
      data-demotime-static
      aria-hidden="true"
      className="pointer-events-none"
      style={{
        position: 'fixed',
        top: 0,
        left: -10000,
        width: 960,
        height: 540,
        overflow: 'hidden',
        visibility: 'hidden',
      }}
    >
      <div
        key={`${crntIdx}-${getCacheKey(slide)}`}
        className={`slide ${slide.frontmatter.theme || SlideTheme.default} relative w-full h-full overflow-hidden`}
      >
        <div className="slide__container absolute top-0 left-0 w-[960px] h-[540px]">
          <div className={`slide__layout ${layout}`}>
            {layout === SlideLayout.ImageLeft && (
              <div className="slide__image_left w-full h-full"></div>
            )}
            <div className="slide__content">
              <Markdown
                filePath={filePath}
                content={slide.content}
                matter={matter}
                vsCodeTheme={vsCodeTheme}
                isDarkTheme={isDarkTheme}
                webviewUrl={webviewUrl}
                isStatic
                updateBgStyles={noop}
              />
            </div>
            {layout === SlideLayout.ImageRight && (
              <div className="slide__image_right w-full h-full"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
