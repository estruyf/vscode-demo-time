import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { SlideLayout, WebViewMessages } from '../../constants';
import { Markdown } from './Markdown';
import { EventData } from '@estruyf/vscode';
import { useScale } from '../hooks/useScale';
import { useFileContents } from '../hooks/useFileContents';
import useCursor from '../hooks/useCursor';
import { SlideControls } from './SlideControls';
import useTheme from '../hooks/useTheme';
import { Slide } from '../../models';
import { SlideParser } from '../../services/SlideParser';

export interface IMarkdownPreviewProps {
  fileUri: string;
  webviewUrl: string | null;
}

export const MarkdownPreview: React.FunctionComponent<IMarkdownPreviewProps> = ({
  fileUri,
  webviewUrl
}: React.PropsWithChildren<IMarkdownPreviewProps>) => {
  const { content, crntFilePath, getFileContents } = useFileContents();
  const [theme, setTheme] = React.useState<string | undefined>(undefined);
  const [layout, setLayout] = React.useState<string | undefined>(undefined);
  const [bgStyles, setBgStyles] = React.useState<any | null>(null);
  const [showControls, setShowControls] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const slideRef = React.useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = React.useState<{ x: number; y: number } | null>(null);
  const { cursorVisible, resetCursorTimeout } = useCursor();
  const { vsCodeTheme, isDarkTheme } = useTheme();
  const [slides, setSlides] = React.useState<Slide[]>([]);
  const [crntSlide, setCrntSlide] = React.useState<Slide | null>(null);
  const { scale } = useScale(ref, slideRef);

  const messageListener = (message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.triggerUpdate) {
      setSlides([]);
      setCrntSlide(null);
      messageHandler.send(WebViewMessages.toVscode.setIsSlideGroup, { slideGroup: false });
      getFileContents(payload);
    }
  };

  const updateSlideIdx = React.useCallback((slideIdx: number) => {
    if (slideIdx < 0 || slideIdx >= slides.length) {
      messageHandler.send(WebViewMessages.toVscode.setIsSlideGroup, { slideGroup: false });
      return;
    }
    const slide = slides[slideIdx];
    setCrntSlide(slide);
  }, [slides]);

  const slidesListener = React.useCallback((message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.nextSlide) {
      const nextSlide = crntSlide ? crntSlide.index + 1 : 1;
      updateSlideIdx(nextSlide);
    }
  }, [crntSlide, slides.length, updateSlideIdx]);

  const getBgStyles = React.useCallback(() => {
    if (!layout || layout === SlideLayout.ImageLeft || layout === SlideLayout.ImageRight) {
      return undefined;
    }

    return bgStyles;
  }, [bgStyles, layout]);

  const handleMouseMove = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    resetCursorTimeout();

    const rect = slideRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePosition({
        x: Math.round((event.clientX - rect.left) / scale),
        y: Math.round((event.clientY - rect.top) / scale),
      });
    }
  }, [resetCursorTimeout, scale]);

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
        messageHandler.send(WebViewMessages.toVscode.setIsSlideGroup, { slideGroup: true });
      }
    }
  }, [content]);

  React.useEffect(() => {
    getFileContents(fileUri);
  }, [fileUri]);

  React.useEffect(() => {
    Messenger.listen(slidesListener);

    if (slides.length === 1) {
      messageHandler.send(WebViewMessages.toVscode.setIsSlideGroup, { slideGroup: false });
    } else if (slides.length > 1 && crntSlide?.index === slides.length - 1) {
      messageHandler.send(WebViewMessages.toVscode.setIsSlideGroup, { slideGroup: false });
    } else if (slides.length > 1) {
      messageHandler.send(WebViewMessages.toVscode.setIsSlideGroup, { slideGroup: true });
    }

    return () => {
      Messenger.unlisten(slidesListener);
    };
  }, [slides.length, crntSlide]);

  React.useEffect(() => {
    Messenger.listen(messageListener);

    setSlides([]);
    setCrntSlide(null);
    messageHandler.send(WebViewMessages.toVscode.setIsSlideGroup, { slideGroup: false });

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
              layout === SlideLayout.ImageLeft && (
                <div className={`slide__image_left w-full h-full`} style={bgStyles}></div>
              )
            }

            {
              crntSlide && vsCodeTheme ? (
                <div className='slide__content'>
                  {
                    <Markdown
                      filePath={crntFilePath}
                      content={crntSlide.content}
                      vsCodeTheme={vsCodeTheme}
                      isDarkTheme={isDarkTheme}
                      webviewUrl={webviewUrl}
                      updateTheme={setTheme}
                      updateLayout={setLayout}
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
          </div>
        </div>

        <SlideControls show={true} path={relativePath} slides={slides.length} currentSlide={crntSlide?.index} updateSlideIdx={updateSlideIdx}>
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