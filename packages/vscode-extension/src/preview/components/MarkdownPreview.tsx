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
import { LaserPointer } from './LaserPointer';

export interface IMarkdownPreviewProps {
  fileUri: string;
  slideIdx?: number;
  webviewUrl: string | null;
}

export const MarkdownPreview: React.FunctionComponent<IMarkdownPreviewProps> = ({
  fileUri,
  slideIdx,
  webviewUrl
}: React.PropsWithChildren<IMarkdownPreviewProps>) => {
  const [theme, setTheme] = React.useState<string | undefined>(undefined);
  const [layout, setLayout] = React.useState<string | undefined>(undefined);
  const [bgStyles, setBgStyles] = React.useState<any | null>(null);
  const [showControls, setShowControls] = React.useState(false);
  const [slides, setSlides] = React.useState<Slide[]>([]);
  const [crntSlide, setCrntSlide] = React.useState<Slide | null>(null);
  const [isMouseMoveEnabled, setIsMouseMoveEnabled] = React.useState(false);
  const [laserPointerEnabled, setLaserPointerEnabled] = React.useState(false);
  const [transition, setTransition] = React.useState<SlideTransition | undefined>(undefined);
  const [header, setHeader] = React.useState<string | undefined>(undefined);
  const [footer, setFooter] = React.useState<string | undefined>(undefined);
  const [isZoomed, setIsZoomed] = React.useState(false);
  const [zoomLevel, setZoomLevel] = React.useState(2.0); // 2x zoom by default
  const [panOffset, setPanOffset] = React.useState({ x: 0, y: 0 });

  const { content, crntFilePath, initialSlideIndex, getFileContents } = useFileContents();
  const ref = React.useRef<HTMLDivElement>(null);
  const slideRef = React.useRef<HTMLDivElement>(null);
  const { cursorVisible, resetCursorTimeout, hideCursor } = useCursor();
  const { vsCodeTheme, isDarkTheme } = useTheme();
  const { scale } = useScale(ref, slideRef);
  const { mousePosition, handleMouseMove, handleMouseLeave } = useMousePosition(slideRef, scale, resetCursorTimeout);

  const handlePreviewMouseMove = React.useCallback((ev: React.MouseEvent<HTMLDivElement>) => {
    setShowControls(true);
    resetCursorTimeout();
    if (isMouseMoveEnabled || laserPointerEnabled || isZoomed) {
      if (isZoomed) {
        handleZoomedMouseMove(ev);
      } else {
        handleMouseMove(ev);
      }
    }
  }, [isMouseMoveEnabled, laserPointerEnabled, handleMouseMove, isZoomed, resetCursorTimeout]);

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


  // Load the correct slide based on slideIdx prop
  React.useEffect(() => {
    if (Array.isArray(slides) && slides.length > 0) {
      if (typeof slideIdx === 'number' && slideIdx >= 0 && slideIdx < slides.length) {
        setCrntSlide(slides[slideIdx]);
      } else if (typeof initialSlideIndex === 'number' && initialSlideIndex >= 0 && initialSlideIndex < slides.length) {
        setCrntSlide(slides[initialSlideIndex]);
      } else {
        setCrntSlide(slides[0]);
      }
    } else {
      setCrntSlide(null);
    }
  }, [slideIdx, initialSlideIndex, slides]);

  const updateSlideIdx = React.useCallback((slideIdx: number) => {
    if (slideIdx < 0 || slideIdx >= slides.length) {
      messageHandler.send(WebViewMessages.toVscode.hasNextSlide, false);
      return;
    }
    // Reset zoom and pan when changing slides
    setIsZoomed(false);
    setPanOffset({ x: 0, y: 0 });

    const slide = slides[slideIdx];
    setCrntSlide(slide);
  }, [slides]);

  const toggleZoom = React.useCallback(() => {
    setIsZoomed(prev => {
      if (prev) {
        // Exit zoom - reset pan offset
        setPanOffset({ x: 0, y: 0 });
      }
      return !prev;
    });
  }, []);

  const handleZoomedMouseMove = React.useCallback((event: React.MouseEvent) => {
    if (!isZoomed || !ref.current) {
      return;
    }

    const rect = ref.current.getBoundingClientRect();

    // Calculate mouse position relative to viewport (0 to 1 range)
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Normalize to 0-1 range based on viewport dimensions
    const normalizedX = Math.max(0, Math.min(1, mouseX / rect.width));
    const normalizedY = Math.max(0, Math.min(1, mouseY / rect.height));

    // Calculate pan limits to reach all edges of zoomed content, factoring in scale
    // The visible area is 960x540, but the zoomed content is larger by zoomLevel * scale
    const effectiveZoom = zoomLevel * scale;
    const maxPanX = Math.max(0, ((960 * effectiveZoom) - rect.width) / 2);
    const maxPanY = Math.max(0, ((540 * effectiveZoom) - rect.height) / 2);

    // Clamp panOffset so the slide edges never go beyond the viewport
    const panX = maxPanX * (1 - 2 * normalizedX);
    const panY = maxPanY * (1 - 2 * normalizedY);

    setPanOffset({
      x: Math.max(-maxPanX, Math.min(maxPanX, panX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, panY))
    });
  }, [isZoomed, zoomLevel, scale]);

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

  // ESC key handler for zoom
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isZoomed) {
        toggleZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isZoomed, toggleZoom]);

  return (
    <>
      <div
        key={crntFilePath}
        ref={ref}
        className={`slide ${theme || "default"} relative w-full h-full overflow-hidden`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => {
          setShowControls(false);
          if (laserPointerEnabled) {
            handleMouseLeave();
          }
        }}
        onMouseMove={handlePreviewMouseMove}
        style={{ cursor: laserPointerEnabled ? 'none' : (cursorVisible ? 'default' : 'none') }}
      >
        <div
          className='slide__container absolute top-[50%] left-[50%] w-[960px] h-[540px] transition-transform duration-300'
          style={{
            transform: `translate(-50%, -50%) scale(${isZoomed ? scale * zoomLevel : 'var(--demotime-scale, 1)'}) translate(${isZoomed ? panOffset.x / (scale * zoomLevel) : 0}px, ${isZoomed ? panOffset.y / (scale * zoomLevel) : 0}px)`
          }}>
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

            {/* Laser Pointer */}
            {mousePosition && laserPointerEnabled && (
              <LaserPointer
                x={mousePosition.x}
                y={mousePosition.y}
                visible={true}
              />
            )}
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
          laserPointerEnabled={laserPointerEnabled}
          onLaserPointerToggle={setLaserPointerEnabled}
          isZoomed={isZoomed}
          onZoomToggle={toggleZoom}
          style={{ cursor: 'default' }}
          matter={crntSlide?.frontmatter}
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