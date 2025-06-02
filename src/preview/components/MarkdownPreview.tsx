import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { Config, SlideLayout, SlideTheme, WebViewMessages } from '../../constants';
import { Markdown } from './Markdown';
import { EventData } from '@estruyf/vscode';
import { useScale } from '../hooks/useScale';
import { useFileContents } from '../hooks/useFileContents';
import useCursor from '../hooks/useCursor';
import { SlideControls } from './SlideControls';
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
  const ref = React.useRef<HTMLDivElement>(null);
  const slideRef = React.useRef<HTMLDivElement>(null);

  const { content, crntFilePath, getFileContents } = useFileContents();
  const { cursorVisible, resetCursorTimeout } = useCursor();
  const { scale } = useScale(ref, slideRef);
  const { mousePosition, handleMouseMove } = useMousePosition(slideRef, scale, resetCursorTimeout);
  const { vsCodeTheme, isDarkTheme } = useTheme();

  const [bgStyles, setBgStyles] = React.useState<any | null>(null);
  const [crntSlide, setCrntSlide] = React.useState<Slide | null>(null);
  const [footer, setFooter] = React.useState<string | undefined>(undefined);
  const [header, setHeader] = React.useState<string | undefined>(undefined);
  const [layout, setLayout] = React.useState<string | undefined>(undefined);
  const [showControls, setShowControls] = React.useState(false);
  const [slides, setSlides] = React.useState<Slide[]>([]);
  const [theme, setTheme] = React.useState<string | undefined>(undefined);

  const messageListener = (message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.triggerUpdate) {
      setSlides([]);
      setCrntSlide(null);
      messageHandler.send(WebViewMessages.toVscode.hasNextSlide, false);
      messageHandler.send(WebViewMessages.toVscode.hasPreviousSlide, false);
      getFileContents(payload);
    }
  };

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

  const fetchTemplate = React.useCallback(
    async (
      configKey: string,
      setter: React.Dispatch<React.SetStateAction<string | undefined>>
    ) => {
      try {
        const template = await messageHandler.request<string>(
          WebViewMessages.toVscode.getSetting,
          configKey
        );
        if (template && crntSlide?.frontmatter) {
          const processed = convertTemplateToHtml(template, crntSlide.frontmatter);
          setter(processed);
        }
      } catch {
        setter(undefined);
      }
    },
    [crntSlide]
  );

  const fetchHeader = React.useCallback(() => {
    fetchTemplate(Config.slides.slideHeaderTemplate, setHeader);
  }, [fetchTemplate]);

  const fetchFooter = React.useCallback(() => {
    fetchTemplate(Config.slides.slideFooterTemplate, setFooter);
  }, [fetchTemplate]);

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
    getFileContents(fileUri);
  }, [fileUri]);

  React.useEffect(() => {
    setTheme(crntSlide?.frontmatter.theme || SlideTheme.default);
    setLayout(crntSlide?.frontmatter.layout || SlideLayout.Default);

    if (crntSlide && crntSlide.frontmatter.header) {
      setHeader(convertTemplateToHtml(crntSlide.frontmatter.header, crntSlide.frontmatter));
    } else {
      fetchHeader();
    }

    if (crntSlide && crntSlide.frontmatter.footer) {
      setFooter(convertTemplateToHtml(crntSlide.frontmatter.footer, crntSlide.frontmatter));
    } else {
      fetchFooter();
    }
  }, [crntSlide]);

  React.useEffect(() => {
    Messenger.listen(slidesListener);

    if (slides.length === 1) {
      messageHandler.send(WebViewMessages.toVscode.hasNextSlide, false);
      messageHandler.send(WebViewMessages.toVscode.hasPreviousSlide, false);
    } else if (slides.length > 1 && crntSlide?.index === slides.length - 1) {
      messageHandler.send(WebViewMessages.toVscode.hasNextSlide, false);
      messageHandler.send(WebViewMessages.toVscode.hasPreviousSlide, true);
    } else if (slides.length > 1) {
      messageHandler.send(WebViewMessages.toVscode.hasNextSlide, true);
      messageHandler.send(WebViewMessages.toVscode.hasPreviousSlide, (crntSlide?.index && crntSlide.index > 0));
    }

    return () => {
      Messenger.unlisten(slidesListener);
    };
  }, [slides.length, crntSlide]);

  React.useEffect(() => {
    Messenger.listen(messageListener);

    setSlides([]);
    setCrntSlide(null);
    messageHandler.send(WebViewMessages.toVscode.hasNextSlide, false);
    messageHandler.send(WebViewMessages.toVscode.hasPreviousSlide, false);

    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  return (
    <>
      <div
        key={crntFilePath}
        ref={ref}
        className={`slide ${theme || "default"} relative w-full h-full overflow-hidden`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        onMouseMove={handleMouseMove}
        style={{ cursor: cursorVisible ? 'default' : 'none' }}
      >
        <div
          className='slide__container absolute top-[50%] left-[50%] w-[960px] h-[540px]'
          style={{ transform: 'translate(-50%, -50%) scale(var(--demotime-scale, 1))' }}>
          <div
            ref={slideRef}
            className={`slide__layout ${layout || "default"}`}
            style={getBgStyles()}>

            {
              header && (
                <header className={`slide__header`} dangerouslySetInnerHTML={{ __html: header }}></header>
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
                <footer className={`slide__footer`} dangerouslySetInnerHTML={{ __html: footer }}></footer>
              )
            }
          </div>
        </div>

        <SlideControls show={showControls && cursorVisible} path={relativePath} slides={slides.length} currentSlide={crntSlide?.index} updateSlideIdx={updateSlideIdx}>
          {/* Mouse Position */}
          {mousePosition && showControls && cursorVisible && (
            <div className="mouse-position text-sm px-2 py-1 text-[var(--vscode-editorWidget-foreground)]">
              X: {mousePosition.x}, Y: {mousePosition.y}
            </div>
          )}
        </SlideControls>
      </div >
    </>
  );
};