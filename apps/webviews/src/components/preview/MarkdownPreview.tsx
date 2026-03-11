import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { Markdown } from './Markdown';
import { EventData } from '@estruyf/vscode';
import { SlideControls } from './SlideControls';
import { LaserPointer } from './LaserPointer';
import DOMPurify from 'dompurify';
import { Config, convertTemplateToHtml, Slide, SlideLayout, SlideParser, SlideTheme, SlideTransition, WebViewMessages } from '@demotime/common';
import { useFileContents, useCursor, useScale, useMousePosition, useTheme } from '../../hooks';
import { extractFirstH1 } from '../../utils';
import { AnimatedSVGSlide } from '../slides/AnimatedSVGSlide';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const [zoomLevel,] = React.useState(2.0); // 2x zoom by default
  const [panOffset, setPanOffset] = React.useState({ x: 0, y: 0 });
  const [svgContent, setSvgContent] = React.useState<string | null>(null);

  const { content, crntFilePath, initialSlideIndex, getFileContents } = useFileContents();
  const ref = React.useRef<HTMLDivElement>(null);
  const slideRef = React.useRef<HTMLDivElement>(null);
  const { cursorVisible, resetCursorTimeout, hideCursor } = useCursor();
  const { vsCodeTheme, isDarkTheme } = useTheme();
  const { scale } = useScale(ref, slideRef);
  const { mousePosition, handleMouseMove, handleMouseLeave } = useMousePosition(slideRef, scale, resetCursorTimeout);

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
  }, [isMouseMoveEnabled, laserPointerEnabled, handleMouseMove, isZoomed, resetCursorTimeout, handleZoomedMouseMove]);

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
          if (template.includes(`{{crntSlideIdx}}`)) {
            const crntSlideIdx = await messageHandler.request<number>(WebViewMessages.toVscode.preview.getGlobalSlideIndex, {
              filePath: crntFilePath,
              localSlideIdx: crntSlide.index
            });
            crntSlide.frontmatter.crntSlideIdx = crntSlideIdx;
          }

          if (template.includes(`{{totalSlides}}`)) {
            const totalSlides = await messageHandler.request<number>(WebViewMessages.toVscode.preview.getTotalSlides);
            crntSlide.frontmatter.totalSlides = totalSlides;
          }

          const processed = convertTemplateToHtml(template, crntSlide.frontmatter, webviewUrl);
          setter(processed);
        }
      } catch {
        setter(undefined);
      }
    },
    [crntFilePath, crntSlide?.frontmatter, crntSlide?.index, webviewUrl]
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
      messageHandler.send(WebViewMessages.toVscode.nextSlideTitle, undefined);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slidesListener = React.useCallback(async (message: MessageEvent<EventData<any>>) => {
    const { command } = message.data;
    if (!command) {
      return;
    }

    // When the extension requests a next slide, give in-webview components
    // a chance to consume the event (e.g. paused AnimatedSVGSlide). First
    // do a synchronous check so consumers that already resumed can mark
    // the event as consumed before we advance. If not consumed, fall back
    // to the async checkNext handshake.
    if (command === WebViewMessages.toWebview.nextSlide) {
      // If a slide previously consumed a next and hasn't yet signalled completion,
      // ignore further next requests for that slide (they should be pressed again after completion).
      if (consumedSlideIndexRef.current !== null && consumedSlideIndexRef.current === crntSlide?.index) {
        return;
      }
      // Synchronous check: dispatch an event that listeners may mutate
      // (set `detail.consumed = true`) to indicate they handled the next.
      const syncEv = new CustomEvent('demotime.preview.syncCheck', { detail: { slideIndex: crntSlide?.index, consumed: false } }) as CustomEvent<{
        slideIndex?: number;
        consumed: boolean;
      }>;
      window.dispatchEvent(syncEv);
      if (syncEv.detail && syncEv.detail.consumed) {
        console.debug('[MarkdownPreview] syncCheck consumed by slide', { slideIndex: crntSlide?.index });
        return; // consumed synchronously
      }

      // Ask in-webview components if they want to consume the next event
      const consumed = await new Promise<boolean>((resolve) => {
        let done = false;
        const onConsumed = () => {
          if (done) { return; }
          done = true;
          cleanup();
          resolve(true);
        };

        const cleanup = () => {
          window.removeEventListener('demotime.preview.nextConsumed', onConsumed);
          clearTimeout(timer);
        };

        const timer = setTimeout(() => {
          if (done) { return; }
          done = true;
          cleanup();
          resolve(false);
        }, 250);

        window.addEventListener('demotime.preview.nextConsumed', onConsumed);

        // Dispatch the async check; include current slide index for debugging/context
        console.debug('[MarkdownPreview] dispatching demotime.preview.checkNext', { slideIndex: crntSlide?.index });
        window.dispatchEvent(new CustomEvent('demotime.preview.checkNext', { detail: { slideIndex: crntSlide?.index } }));
      });

      if (consumed) {
        // A component handled the 'next' by resuming animation — do not advance.
        // Remember which slide consumed the next so we can ignore additional nexts until completion
        // onConsumed will already set this, but ensure it's recorded here too
        consumedSlideIndexRef.current = crntSlide?.index ?? null;
        return;
      }

      const nextSlide = crntSlide ? crntSlide.index + 1 : 1;
      updateSlideIdx(nextSlide);
      messageHandler.send(WebViewMessages.toVscode.updateSlideIndex, nextSlide);
    } else if (command === WebViewMessages.toWebview.previousSlide) {
      const previousSlide = crntSlide ? crntSlide.index - 1 : 0;
      updateSlideIdx(previousSlide);
      messageHandler.send(WebViewMessages.toVscode.updateSlideIndex, previousSlide);
    }
  }, [crntSlide, updateSlideIdx]);

  const getBgStyles = React.useCallback(() => {
    if (!layout || layout === SlideLayout.ImageLeft || layout === SlideLayout.ImageRight) {
      return undefined;
    }

    return bgStyles;
  }, [bgStyles, layout]);

  // Track which slide (if any) consumed a 'next' request and is waiting to complete
  const consumedSlideIndexRef = React.useRef<number | null>(null);

  // Listen for slide-level events indicating they consumed a next, or that their animation completed
  React.useEffect(() => {
    const onConsumed = (ev: Event) => {
      const ce = ev as CustomEvent<{ slideIndex?: number }>;
      const idx = ce && ce.detail && typeof ce.detail.slideIndex === 'number' ? ce.detail.slideIndex : null;
      consumedSlideIndexRef.current = idx;
    };

    const onComplete = (ev: Event) => {
      const ce = ev as CustomEvent<{ slideIndex?: number }>;
      const idx = ce && ce.detail && typeof ce.detail.slideIndex === 'number' ? ce.detail.slideIndex : null;
      if (consumedSlideIndexRef.current === idx) {
        consumedSlideIndexRef.current = null;
      }
    };

    window.addEventListener('demotime.preview.nextConsumed', onConsumed as EventListener);
    window.addEventListener('demotime.preview.animationComplete', onComplete as EventListener);
    return () => {
      window.removeEventListener('demotime.preview.nextConsumed', onConsumed as EventListener);
      window.removeEventListener('demotime.preview.animationComplete', onComplete as EventListener);
    };
  }, []);

  const relativePath = React.useMemo(() => {
    return crntFilePath ? crntFilePath.replace(webviewUrl || "", "") : undefined;
  }, [crntFilePath, webviewUrl]);

  const videoUrl = React.useMemo(() => {
    if (crntSlide?.frontmatter.video && webviewUrl) {
      const video = crntSlide.frontmatter.video;
      if (!video) { return undefined; }

      // If the video is already an absolute URL (has a scheme like http:, data:, or protocol-relative //), return it as-is
      if (/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/.test(video)) {
        return video;
      }

      const base = webviewUrl.endsWith('/') ? webviewUrl.slice(0, -1) : webviewUrl;
      const path = video.startsWith('/') ? video.slice(1) : video;
      return `${base}/${path}`;
    }

    return undefined;
  }, [crntSlide?.frontmatter.video, webviewUrl]);

  React.useEffect(() => {
    if (content) {
      const parser = new SlideParser();
      const allSlides = parser.parseSlides(content);
      setSlides(allSlides);
      setCrntSlide(allSlides[0]);
      if (allSlides.length > 1) {
        messageHandler.send(WebViewMessages.toVscode.hasNextSlide, true);
        const nextTitle = extractFirstH1(allSlides[1].content);
        if (nextTitle) {
          messageHandler.send(WebViewMessages.toVscode.nextSlideTitle, nextTitle);
        }
      }
    }
  }, [content]);

  React.useEffect(() => {
    setTheme(crntSlide?.frontmatter.theme || SlideTheme.default);
    setLayout(crntSlide?.frontmatter.layout || SlideLayout.Default);
    setTransition(crntSlide?.frontmatter.transition || undefined);

    if (crntSlide && crntSlide.frontmatter.header) {
      const html = convertTemplateToHtml(crntSlide.frontmatter.header, crntSlide.frontmatter, webviewUrl);
      setHeader(DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }));
    } else {
      fetchHeader();
    }

    if (crntSlide && crntSlide.frontmatter.footer) {
      const html = convertTemplateToHtml(crntSlide.frontmatter.footer, crntSlide.frontmatter, webviewUrl);
      setFooter(DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }));
    } else {
      fetchFooter();
    }

    // Load SVG content for animated-svg layout
    if (crntSlide?.frontmatter.layout === SlideLayout.AnimatedSVG && crntSlide.frontmatter.svgFile) {
      setSvgContent(null); // Reset while loading
      messageHandler
        .request<string>(WebViewMessages.toVscode.getFileContents, crntSlide.frontmatter.svgFile)
        .then((content) => {
          if (content) {
            setSvgContent(content);
          } else {
            console.error('Failed to load SVG file:', crntSlide.frontmatter.svgFile);
          }
        })
        .catch((error) => {
          console.error('Error loading SVG file:', error);
        });
    } else {
      setSvgContent(null);
    }
  }, [crntSlide, webviewUrl, fetchHeader, fetchFooter]);


  React.useEffect(() => {
    Messenger.listen(slidesListener);

    if (slides === null || slides.length === 0 || slides.length === 1) {
      messageHandler.send(WebViewMessages.toVscode.hasNextSlide, false);
      messageHandler.send(WebViewMessages.toVscode.hasPreviousSlide, false);
      messageHandler.send(WebViewMessages.toVscode.nextSlideTitle, undefined);
    } else if (slides.length > 1 && crntSlide?.index === slides.length - 1) {
      messageHandler.send(WebViewMessages.toVscode.hasNextSlide, false);
      messageHandler.send(WebViewMessages.toVscode.hasPreviousSlide, true);
      messageHandler.send(WebViewMessages.toVscode.nextSlideTitle, undefined);
    } else if (slides.length > 1) {
      messageHandler.send(WebViewMessages.toVscode.hasNextSlide, true);
      messageHandler.send(WebViewMessages.toVscode.hasPreviousSlide, (crntSlide?.index !== undefined && crntSlide.index > 0));

      const nextSlideIdx = crntSlide?.index !== undefined ? crntSlide.index + 1 : 0;
      const nextTitle = extractFirstH1(slides[nextSlideIdx].content);
      if (nextTitle) {
        messageHandler.send(WebViewMessages.toVscode.nextSlideTitle, nextTitle);
      }
    }

    return () => {
      Messenger.unlisten(slidesListener);
    };
  }, [slides, crntSlide, slidesListener]);

  React.useEffect(() => {
    getFileContents(fileUri);
  }, [fileUri, getFileContents]);

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

  React.useEffect(() => {
    if (crntSlide?.index !== undefined) {
      messageHandler.send(WebViewMessages.toVscode.preview.recordOpenSlide, {
        slideIndex: crntSlide.index,
        filePath: crntFilePath,
        slideTitle: extractFirstH1(crntSlide.content)
      });
    }
  }, [crntFilePath, crntSlide]);

  // Cleanup effect for video elements when slide changes
  React.useEffect(() => {
    // Pause and cleanup any existing videos when slide changes
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      video.pause();
    });

    // Small delay to allow new slide to render before cleaning up DOM
    const timeoutId = setTimeout(() => {
      // Remove any orphaned video elements that might be left over
      const orphanedVideos = document.querySelectorAll('video:not([src])');
      orphanedVideos.forEach(video => {
        const parent = video.parentElement;
        if (parent && parent.children.length === 1) {
          parent.remove();
        } else {
          video.remove();
        }
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [crntSlide?.index, crntSlide?.frontmatter?.customLayout]);

  return (
    <>
      <div
        key={`${crntFilePath}-${crntSlide?.index || 0}-${crntSlide?.frontmatter?.customLayout || 'standard'}`}
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
              (layout === SlideLayout.Video && videoUrl && !crntSlide?.frontmatter.controls) && (
                <div className="slide__video" aria-hidden="true">
                  <video autoPlay loop muted playsInline preload="auto" src={videoUrl}></video>
                </div>
              )
            }

            {
              layout === SlideLayout.ImageLeft && (
                <div className={`slide__image_left w-full h-full`} style={bgStyles}></div>
              )
            }

            {
              crntSlide && vsCodeTheme ? (
                layout === SlideLayout.AnimatedSVG && svgContent ? (
                  <AnimatedSVGSlide
                    svgContent={svgContent}
                    animationSpeed={crntSlide.frontmatter.animationSpeed}
                    textTypeWriterEffect={crntSlide.frontmatter.textTypeWriterEffect}
                    textTypeWriterSpeed={crntSlide.frontmatter.textTypeWriterSpeed}
                    autoplay={crntSlide.frontmatter.autoplay}
                    showCompleteDiagram={crntSlide.frontmatter.showCompleteDiagram}
                    invertLightAndDarkColours={crntSlide.frontmatter.invertLightAndDarkColours}
                    transportControlsPosition={crntSlide.frontmatter.transportControlsPosition}
                    slideIndex={crntSlide.index}
                    isActive={true}
                  />
                ) : (
                  <div className='slide__content'>
                    {
                      <Markdown
                        key={`${crntSlide.index}-${crntSlide?.frontmatter?.customLayout || 'standard'}`}
                        filePath={crntFilePath}
                        content={crntSlide.content}
                        matter={crntSlide.frontmatter}
                        vsCodeTheme={vsCodeTheme as never}
                        isDarkTheme={isDarkTheme}
                        webviewUrl={webviewUrl}
                        videoUrl={videoUrl}
                        updateBgStyles={setBgStyles}
                      />
                    }
                  </div>
                )
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
            <div className="mouse-position text-sm px-2 py-1 text-(--vscode-editorWidget-foreground)">
              X: {mousePosition.x}, Y: {mousePosition.y}
            </div>
          )}
        </SlideControls>
      </div>
    </>
  );
};

