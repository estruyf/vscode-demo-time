import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { Config, SlideLayout, SlideTheme, SlideTransition, WebViewMessages } from '../../constants';
import { Markdown } from './Markdown';
import { EventData } from '@estruyf/vscode';
import { useScale } from '../hooks/useScale';
import { useFileContents } from '../hooks/useFileContents';
import useCursor from '../hooks/useCursor';
import { SlideControls } from './SlideControls';
// Removed WebViewMessages import as setInitialSlide is no longer used here directly for listener
import useTheme from '../hooks/useTheme';
import { Slide } from '../../models';
import { SlideParser } from '../../services/SlideParser';
import { useMousePosition } from '../hooks/useMousePosition';
import { convertTemplateToHtml } from '../../utils/convertTemplateToHtml';

export interface IMarkdownPreviewProps {
  fileUri: string;
  webviewUrl: string | null;
}

export const MarkdownPreview: React.FunctionComponent<IMarkdownPreviewProps> = ({
  fileUri,
  webviewUrl
}: React.PropsWithChildren<IMarkdownPreviewProps>) => {
  const [theme, setTheme] = React.useState<string | undefined>(undefined);
  const [layout, setLayout] = React.useState<string | undefined>(undefined);
  const [bgStyles, setBgStyles] = React.useState<any | null>(null);
  const [showControls, setShowControls] = React.useState(false);
  const [slides, setSlides] = React.useState<Slide[]>([]);
  const [crntSlide, setCrntSlide] = React.useState<Slide | null>(null);
  const [isMouseMoveEnabled, setIsMouseMoveEnabled] = React.useState(false);
  const [transition, setTransition] = React.useState<SlideTransition | undefined>(undefined);
  const [header, setHeader] = React.useState<string | undefined>(undefined);
  const [footer, setFooter] = React.useState<string | undefined>(undefined);

  const { content, crntFilePath, initialSlideIndex, getFileContents } = useFileContents();
  const ref = React.useRef<HTMLDivElement>(null);
  const slideRef = React.useRef<HTMLDivElement>(null);
  const { cursorVisible, resetCursorTimeout, hideCursor } = useCursor();
  const { vsCodeTheme, isDarkTheme } = useTheme();
  const { scale } = useScale(ref, slideRef);
  const { mousePosition, handleMouseMove } = useMousePosition(slideRef, scale, resetCursorTimeout);

  const handlePreviewMouseMove = React.useCallback((ev: React.MouseEvent<HTMLDivElement>) => {
    setShowControls(true);
    resetCursorTimeout();
    if (isMouseMoveEnabled) {
      handleMouseMove(ev);
    }
  }, [isMouseMoveEnabled, handleMouseMove, resetCursorTimeout]);

  const hidePreviewControls = React.useCallback(() => {
    setShowControls(false);
    hideCursor();
  }, [hideCursor]);

  const fetchTemplate = React.useCallback(
    async (
      configKey: string,
      setter: React.Dispatch<React.SetStateAction<string | undefined>>
    ) => {
      try {
        const templatePath = await messageHandler.request<string>(
          WebViewMessages.toVscode.getSetting,
          configKey
        );
        if (!templatePath) {
          setter(undefined);
          return;
        }

        const template = await messageHandler.request<string>(
          WebViewMessages.toVscode.getFileContents,
          templatePath
        );
        if (!template) {
          setter(undefined);
          return;
        }

        if (template && crntSlide?.frontmatter) {
          const processed = convertTemplateToHtml(template, crntSlide.frontmatter, webviewUrl);
          setter(processed);
        }
      } catch {
        setter(undefined);
      }
    },
    [crntSlide, webviewUrl]
  );

  const fetchHeader = React.useCallback(() => {
    fetchTemplate(Config.slides.slideHeaderTemplate, setHeader);
  }, [fetchTemplate]);

  const fetchFooter = React.useCallback(() => {
    fetchTemplate(Config.slides.slideFooterTemplate, setFooter);
  }, [fetchTemplate]);

  React.useEffect(() => {
    // If slides are loaded and initialSlideIndex is a valid number
    if (Array.isArray(slides) && slides.length > 0) {
      if (typeof initialSlideIndex === 'number' && initialSlideIndex >= 0 && initialSlideIndex < slides.length) {
        setCrntSlide(slides[initialSlideIndex]);
      } else {
        setCrntSlide(slides[0]);
      }
    } else {
      // No slides loaded or slides is empty
      setCrntSlide(null);
    }
  }, [initialSlideIndex, slides]);

  const updateSlideIdx = React.useCallback((slideIdx: number) => {
    if (slideIdx < 0 || slideIdx >= slides.length) {
      messageHandler.send(WebViewMessages.toVscode.hasNextSlide, false);
      return;
    }
    const slide = slides[slideIdx];
    setCrntSlide(slide);
  }, [slides]);

  const slidesListener = React.useCallback((message: MessageEvent<EventData<any>>) => {
    const { command } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.nextSlide) {
      const nextSlide = crntSlide ? crntSlide.index + 1 : 1;
      updateSlideIdx(nextSlide);
    } else if (command === WebViewMessages.toWebview.previousSlide) {
      const previousSlide = crntSlide ? crntSlide.index - 1 : 0;
      updateSlideIdx(previousSlide);
    }
  }, [crntSlide, slides.length, updateSlideIdx]);

  const getBgStyles = React.useCallback(() => {
    if (!layout || layout === SlideLayout.ImageLeft || layout === SlideLayout.ImageRight) {
      return undefined;
    }

    return bgStyles;
  }, [bgStyles, layout]);

  const relativePath = React.useMemo(() => {
    return crntFilePath ? crntFilePath.replace(webviewUrl || "", "") : undefined;
  }, [crntFilePath, webviewUrl]);

  React.useEffect(() => {
    if (content) {
      const parser = new SlideParser();
      const allSlides = parser.parseSlides(content);
      setSlides(allSlides);
      setCrntSlide(allSlides[0]);
      if (allSlides.length > 1) {
        messageHandler.send(WebViewMessages.toVscode.hasNextSlide, true);
      }
    }
  }, [content]);

  React.useEffect(() => {
    setTheme(crntSlide?.frontmatter.theme || SlideTheme.default);
    setLayout(crntSlide?.frontmatter.layout || SlideLayout.Default);
    setTransition(crntSlide?.frontmatter.transition || undefined);

    if (crntSlide && crntSlide.frontmatter.header) {
      setHeader(convertTemplateToHtml(crntSlide.frontmatter.header, crntSlide.frontmatter, webviewUrl));
    } else {
      fetchHeader();
    }

    if (crntSlide && crntSlide.frontmatter.footer) {
      setFooter(convertTemplateToHtml(crntSlide.frontmatter.footer, crntSlide.frontmatter, webviewUrl));
    } else {
      fetchFooter();
    }
  }, [crntSlide, webviewUrl]);

  React.useEffect(() => {
    Messenger.listen(slidesListener);

    if (slides === null || slides.length === 0 || slides.length === 1) {
      messageHandler.send(WebViewMessages.toVscode.hasNextSlide, false);
      messageHandler.send(WebViewMessages.toVscode.hasPreviousSlide, false);
    } else if (slides.length > 1 && crntSlide?.index === slides.length - 1) {
      messageHandler.send(WebViewMessages.toVscode.hasNextSlide, false);
      messageHandler.send(WebViewMessages.toVscode.hasPreviousSlide, true);
    } else if (slides.length > 1) {
      messageHandler.send(WebViewMessages.toVscode.hasNextSlide, true);
      messageHandler.send(WebViewMessages.toVscode.hasPreviousSlide, (crntSlide?.index !== undefined && crntSlide.index > 0));
    }

    return () => {
      Messenger.unlisten(slidesListener);
    };
  }, [slides, crntSlide]); // Added slides to dependency array for null/empty check

  React.useEffect(() => {
    getFileContents(fileUri);
  }, [fileUri]);

  return (
    <>
      <div
        key={crntFilePath}
        ref={ref}
        className={`slide ${theme || "default"} relative w-full h-full overflow-hidden`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        onMouseMove={handlePreviewMouseMove}
        style={{ cursor: cursorVisible ? 'default' : 'none' }}
      >
        <div
          className='slide__container absolute top-[50%] left-[50%] w-[960px] h-[540px]'
          style={{ transform: 'translate(-50%, -50%) scale(var(--demotime-scale, 1))' }}>
          <div
            ref={slideRef}
            className={`slide__layout ${layout || "default"} ${transition || ""}`}
            style={getBgStyles()}>
            {
              header && (
                <header className={`slide__header z-20`} dangerouslySetInnerHTML={{ __html: header }}></header>
              )
            }

            {
              layout === SlideLayout.ImageLeft && (
                <div className={`slide__image_left w-full h-full`} style={bgStyles}></div>
              )
            }

            {
              crntSlide && vsCodeTheme ? (
                <div className='slide__content'>
                  {
                    <Markdown
                      key={crntSlide.index}
                      filePath={crntFilePath}
                      content={crntSlide.content}
                      matter={crntSlide.frontmatter}
                      vsCodeTheme={vsCodeTheme}
                      isDarkTheme={isDarkTheme}
                      webviewUrl={webviewUrl}
                      updateBgStyles={setBgStyles}
                    />
                  }
                </div>
              ) : null
            }

            {
              layout === SlideLayout.ImageRight && (
                <div className={`slide__image_right w-full h-full`} style={bgStyles}></div>
              )
            }

            {
              footer && (
                <footer className={`slide__footer z-20`} dangerouslySetInnerHTML={{ __html: footer }}></footer>
              )
            }
          </div>
        </div>

        <SlideControls
          show={showControls && cursorVisible}
          path={relativePath}
          slides={slides.length}
          currentSlide={crntSlide?.index}
          updateSlideIdx={updateSlideIdx}
          triggerMouseMove={setIsMouseMoveEnabled}
          hideControls={hidePreviewControls}
        >
          {/* Mouse Position */}
          {mousePosition && showControls && cursorVisible && (
            <div className="mouse-position text-sm px-2 py-1 text-[var(--vscode-editorWidget-foreground)]">
              X: {mousePosition.x}, Y: {mousePosition.y}
            </div>
          )}
        </SlideControls>
      </div>
    </>
  );
};