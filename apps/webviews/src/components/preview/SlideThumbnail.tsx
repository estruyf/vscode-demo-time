import * as React from 'react';
import { Slide, SlideLayout } from '@demotime/common';
import { Markdown } from './Markdown';

export interface ISlideThumbnailProps {
  slide: Slide;
  vsCodeTheme: never;
  isDarkTheme: boolean;
  webviewUrl: string | null;
  filePath?: string;
  theme?: string;
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
  theme,
}) => {
  const layout = slide.frontmatter?.layout || SlideLayout.Default;

  return (
    <div
      className="w-full aspect-video overflow-hidden relative"
      style={{ backgroundColor: 'var(--vscode-editor-background)' }}
    >
      <div
        className={`slide ${theme || 'default'} absolute top-0 left-0 origin-top-left pointer-events-none`}
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
          <div className={`slide__layout ${layout || 'default'}`}>
            {slide.content && vsCodeTheme && (
              <div className="slide__content">
                <Markdown
                  filePath={filePath}
                  content={slide.content}
                  matter={slide.frontmatter}
                  vsCodeTheme={vsCodeTheme}
                  isDarkTheme={isDarkTheme}
                  webviewUrl={webviewUrl}
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
