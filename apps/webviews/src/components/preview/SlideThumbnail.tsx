import * as React from 'react';
import {
  getSlideBackgroundStyles,
  getSlideClassNames,
  isAutoFitEnabled,
  Slide,
  SlideLayout,
  SlideTheme,
} from '@demotime/common';
import { Markdown } from './Markdown';
import { useSlideOverflow } from '../../hooks';
import { transformImageUrl } from '../../utils';

export interface ISlideThumbnailProps {
  slide: Slide;
  vsCodeTheme: never;
  isDarkTheme: boolean;
  webviewUrl: string | null;
  filePath?: string;
}

const SLIDE_WIDTH = 960;
const SLIDE_HEIGHT = 540;
const noop = () => {};

export const SlideThumbnail: React.FunctionComponent<ISlideThumbnailProps> = ({
  slide,
  vsCodeTheme,
  isDarkTheme,
  webviewUrl,
  filePath,
}) => {
  const layout = slide.frontmatter?.layout || SlideLayout.Default;
  // The theme of the slide itself, the preview uses the same fallback
  const slideTheme = slide.frontmatter?.theme || SlideTheme.default;
  const slideClassNames = getSlideClassNames(slide.frontmatter);
  const slideBgStyles = getSlideBackgroundStyles(
    slide.frontmatter,
    (path) => transformImageUrl(webviewUrl || '', path) || path,
  );
  const layoutRef = React.useRef<HTMLDivElement>(null);
  const autoFit = isAutoFitEnabled(slide.frontmatter);
  // Scales down the content of a slide with `autoFit: true`, like the preview
  useSlideOverflow(layoutRef, {
    enabled: autoFit,
    autoFit,
    slideKey: `${slide.index}-${slide.content}`,
  });

  return (
    // Click steps show their final state, and don't add steps to the current slide
    <div
      className="w-full aspect-video overflow-hidden relative"
      style={{ backgroundColor: 'var(--vscode-editor-background)' }}
      data-demotime-static
    >
      <div
        className={`slide ${slideTheme} absolute top-0 left-0 origin-top-left pointer-events-none`}
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(var(--thumbnail-scale))`,
        }}
      >
        <div
          className="slide__container absolute top-[50%] left-[50%] w-[960px] h-[540px]"
          style={{ transform: 'translate(-50%, -50%) scale(1)' }}
        >
          <div
            ref={layoutRef}
            className={`slide__layout ${layout || 'default'} ${slideClassNames}`}
            style={slideBgStyles}
          >
            {slide.content && vsCodeTheme && (
              <div className="slide__content">
                <Markdown
                  filePath={filePath}
                  content={slide.content}
                  matter={slide.frontmatter}
                  vsCodeTheme={vsCodeTheme}
                  isDarkTheme={isDarkTheme}
                  webviewUrl={webviewUrl}
                  isStatic
                  updateBgStyles={noop}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
