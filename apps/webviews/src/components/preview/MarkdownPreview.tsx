import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { Markdown } from './Markdown';
import { EventData } from '@estruyf/vscode';
import { SlideControls } from './SlideControls';
import { LaserPointer } from './LaserPointer';
import DOMPurify from 'dompurify';
import { Config, getNextSlideIdx, getPreviousSlideIdx, getProgressBarPosition, getProgressPercentage, getSlideHeading, getTemplateData, getTemplateErrorMessage, getVideoAutoplay, getVisibleSlideIdx, hasSlideOverflow, isAutoFitEnabled, isSlideHidden, ProgressBarPosition, renderTemplateError, tryConvertTemplateToHtml, Slide, SlideLayout, SlideOverflow, SlideOverflowEdges, SlideOverflowResult, SlideParser, SlidePlaceholders, SlideTheme, SlideTransition, TemplateErrorOptions, WebViewMessages } from '@demotime/common';
import { Icon } from 'vscrui';
import { useFileContents, useCursor, useScale, useMousePosition, useTheme, useClickSteps, usePresentationMode, useSlideOverflow } from '../../hooks';
import { extractFirstH1, getSlideTitle } from '../../utils';
import { AnimatedSVGSlide } from '../slides/AnimatedSVGSlide';
import { SlideOverflowScanner } from './SlideOverflowScanner';
import { SlideFitBadge } from './SlideFitBadge';
import { SlideOverflowMarker } from './SlideOverflowMarker';
import { nextClickStep, previousClickStep, resetClickSteps } from '../../webcomponents/clickSteps';

export interface IMarkdownPreviewProps {
  fileUri: string;
  slideIdx?: number;
  webviewUrl: string | null;
}

// Height of the bar above a hidden slide
const HIDDEN_BAR_HEIGHT = 36;

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
  const [progress, setProgress] = React.useState<{ position: ProgressBarPosition; crntSlideIdx: number; totalSlides: number; percentage: number } | undefined>(undefined);
  const [isZoomed, setIsZoomed] = React.useState(false);
  const [zoomLevel,] = React.useState(2.0); // 2x zoom by default
  const [panOffset, setPanOffset] = React.useState({ x: 0, y: 0 });
  const [svgContent, setSvgContent] = React.useState<string | null>(null);
  // The overflow of every slide of the file, measured in the background
  const [scannedOverflows, setScannedOverflows] = React.useState<SlideOverflow[]>([]);

  const { content, crntFilePath, initialSlideIndex, getFileContents } = useFileContents();
  const ref = React.useRef<HTMLDivElement>(null);
  const slideRef = React.useRef<HTMLDivElement>(null);
  const { cursorVisible, resetCursorTimeout, hideCursor } = useCursor();
  const { vsCodeTheme, isDarkTheme } = useTheme();
  const isPresentationMode = usePresentationMode();
  // Outside presentation mode, hidden slides are shown so you can edit them, with a bar above them
  const showHiddenMarker = isPresentationMode === false && isSlideHidden(crntSlide ?? undefined);
  const offsetTop = showHiddenMarker ? HIDDEN_BAR_HEIGHT : 0;
  const { scale } = useScale(ref, slideRef, offsetTop);
  const { mousePosition, handleMouseMove, handleMouseLeave } = useMousePosition(slideRef, scale, resetCursorTimeout);
  const clickStep = useClickSteps();
  const autoFit = isAutoFitEnabled(crntSlide?.frontmatter);
  // Outside presentation mode, a badge warns about content that doesn't fit on the slide
  const showOverflowWarning = isPresentationMode === false;
  const liveFit = useSlideOverflow(slideRef, {
    enabled: showOverflowWarning || autoFit,
    autoFit,
    slideKey: `${crntFilePath}-${crntSlide?.index}-${layout}`,
  });
  // The background scan shows the slide with all its click steps, the live measurement the
  // current click step
  const overflow = React.useMemo<SlideOverflow>(() => {
    const scanned = crntSlide ? scannedOverflows[crntSlide.index] : undefined;
    const edge = (side: keyof SlideOverflowEdges) =>
      Math.max(liveFit.overflow.edges?.[side] ?? 0, scanned?.edges?.[side] ?? 0);
    return {
      x: Math.max(liveFit.overflow.x, scanned?.x ?? 0),
      y: Math.max(liveFit.overflow.y, scanned?.y ?? 0),
      edges: { top: edge('top'), right: edge('right'), bottom: edge('bottom'), left: edge('left') },
    };
  }, [liveFit, scannedOverflows, crntSlide]);
  // Hidden slides (`hide: true`) are only skipped while presenting
  const skipHidden = !!isPresentationMode;
  const skipHiddenRef = React.useRef(skipHidden);
  // Going back to the previous slide shows it with all its click steps revealed
  const revealClickStepsRef = React.useRef(false);

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

  /**
   * Gets the template of the header or footer: the `header`/`footer` front matter of the slide, or
   * the file of the global setting. Returns an error block when the file can't be read.
   */
  const getTemplate = React.useCallback(
    async (
      slideTemplate: string | undefined,
      configKey: string,
      title: string
    ): Promise<{ template?: string; html?: string; isSlideTemplate?: boolean; errorOptions?: TemplateErrorOptions }> => {
      if (slideTemplate) {
        return { template: slideTemplate, isSlideTemplate: true, errorOptions: { title, compact: true } };
      }

      const templatePath = await messageHandler.request<string>(WebViewMessages.toVscode.getSetting, configKey);
      if (!templatePath) {
        return {};
      }

      const errorOptions = { title, path: templatePath, compact: true };
      const template = await messageHandler.request<string>(WebViewMessages.toVscode.getFileContents, templatePath);
      if (!template) {
        const message = 'The template file could not be found or is empty.';
        messageHandler.send(WebViewMessages.toVscode.logError, getTemplateErrorMessage(errorOptions, message));
        return { html: renderTemplateError(errorOptions, message) };
      }

      return { template, errorOptions };
    },
    []
  );

  React.useEffect(() => {
    skipHiddenRef.current = skipHidden;
  }, [skipHidden]);

  const isPresentationModeKnown = isPresentationMode !== undefined;

  // Load the correct slide based on slideIdx prop
  // Runs again once the presentation mode is known, but not when it gets toggled, so toggling
  // presentation mode doesn't move away from the current slide.
  React.useEffect(() => {
    if (Array.isArray(slides) && slides.length > 0) {
      let targetIdx = 0;
      if (typeof slideIdx === 'number' && slideIdx >= 0 && slideIdx < slides.length) {
        targetIdx = slideIdx;
      } else if (typeof initialSlideIndex === 'number' && initialSlideIndex >= 0 && initialSlideIndex < slides.length) {
        targetIdx = initialSlideIndex;
      }

      // While presenting, a deck that opens on a hidden slide continues with the next visible slide
      const visibleIdx = skipHiddenRef.current ? getVisibleSlideIdx(slides, targetIdx) : targetIdx;
      setCrntSlide(slides[visibleIdx]);
      if (visibleIdx !== targetIdx) {
        messageHandler.send(WebViewMessages.toVscode.updateSlideIndex, visibleIdx);
      }
    } else {
      setCrntSlide(null);
    }
  }, [slideIdx, initialSlideIndex, slides, isPresentationModeKnown]);

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

  const navigateToSlide = React.useCallback((slideIdx: number) => {
    updateSlideIdx(slideIdx);
    messageHandler.send(WebViewMessages.toVscode.updateSlideIndex, slideIdx);
  }, [updateSlideIdx]);

  const slideOptions = React.useMemo(() => {
    return slides.map((slide) => ({
      index: slide.index,
      title: extractFirstH1(slide.rawContent) || `Slide ${slide.index + 1}`,
      hidden: isSlideHidden(slide),
      overflow: hasSlideOverflow(scannedOverflows[slide.index]) ? scannedOverflows[slide.index] : undefined,
    }));
  }, [slides, scannedOverflows]);

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
      // Reveal the remaining click steps of the slide first
      if (nextClickStep()) {
        return;
      }

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

      const nextSlide = crntSlide ? (getNextSlideIdx(slides, crntSlide.index, skipHidden) ?? slides.length) : 1;
      updateSlideIdx(nextSlide);
      messageHandler.send(WebViewMessages.toVscode.updateSlideIndex, nextSlide);
    } else if (command === WebViewMessages.toWebview.preview.goToSlide) {
      // The editor cursor moved to another slide. The file can have more slides than the preview
      // until it is saved.
      if (typeof message.data.payload !== 'number' || slides.length === 0) {
        return;
      }
      const slideIdx = Math.min(Math.max(message.data.payload, 0), slides.length - 1);
      if (slideIdx !== crntSlide?.index) {
        navigateToSlide(slideIdx);
      }
    } else if (command === WebViewMessages.toWebview.previousSlide) {
      if (previousClickStep()) {
        return;
      }

      const previousSlide = crntSlide ? (getPreviousSlideIdx(slides, crntSlide.index, skipHidden) ?? -1) : 0;
      revealClickStepsRef.current = previousSlide >= 0;
      updateSlideIdx(previousSlide);
      messageHandler.send(WebViewMessages.toVscode.updateSlideIndex, previousSlide);
    }
  }, [crntSlide, slides, skipHidden, updateSlideIdx, navigateToSlide]);

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

  // The extension shows the slides that overflow in the Problems panel
  const onSlidesScanned = React.useCallback((overflows: SlideOverflow[]) => {
    setScannedOverflows(overflows);
    if (!relativePath) {
      return;
    }

    const results: SlideOverflowResult[] = overflows
      .map((slideOverflow, slideIndex) => ({ slideIndex, ...slideOverflow }))
      .filter((result) => hasSlideOverflow(result));
    messageHandler.send(WebViewMessages.toVscode.preview.slideOverflow, {
      path: relativePath,
      overflows: results,
    });
  }, [relativePath]);

  // Double-clicking the slide moves the editor cursor to its source, unless the sync is turned off
  const revealSourceOnDoubleClick = React.useCallback(async (ev: React.MouseEvent<HTMLDivElement>) => {
    if (isPresentationMode !== false || !relativePath || !crntSlide) {
      return;
    }

    // Keep double-clicks on links, buttons and form fields for the element itself
    const target = ev.target as HTMLElement | null;
    if (target?.closest('a, button, input, textarea, select, video, audio, [contenteditable="true"]')) {
      return;
    }

    const isSyncEnabled = await messageHandler.request<boolean>(WebViewMessages.toVscode.getSetting, Config.slides.previewSync);
    if (isSyncEnabled === false) {
      return;
    }

    window.getSelection()?.removeAllRanges();
    messageHandler.send(WebViewMessages.toVscode.preview.revealSource, {
      path: relativePath,
      slideIndex: crntSlide.index,
    });
  }, [isPresentationMode, relativePath, crntSlide]);

  // The presenter view and remote show the notes of the current slide
  React.useEffect(() => {
    messageHandler.send(
      WebViewMessages.toVscode.preview.updateSlideNotes,
      crntSlide ? { notes: crntSlide.notes, path: relativePath, slideIndex: crntSlide.index } : undefined
    );
  }, [crntSlide, relativePath]);

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
      setScannedOverflows([]);
      setCrntSlide(allSlides[0]);
      if (allSlides.length > 1) {
        messageHandler.send(WebViewMessages.toVscode.hasNextSlide, true);
        messageHandler.send(WebViewMessages.toVscode.nextSlideTitle, getSlideTitle(allSlides[1]));
      }
    }
  }, [content]);

  React.useEffect(() => {
    setTheme(crntSlide?.frontmatter.theme || SlideTheme.default);
    setLayout(crntSlide?.frontmatter.layout || SlideLayout.Default);
    setTransition(crntSlide?.frontmatter.transition || undefined);

    // Load SVG content for animated layout
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
  }, [crntSlide]);


  // Header, footer and progress bar of the slide
  React.useEffect(() => {
    let cancelled = false;

    const update = async () => {
      if (!crntSlide) {
        setHeader(undefined);
        setFooter(undefined);
        setProgress(undefined);
        return;
      }

      try {
        const [headerTemplate, footerTemplate, progressSetting] = await Promise.all([
          getTemplate(crntSlide.frontmatter.header, Config.slides.slideHeaderTemplate, 'Header template error'),
          getTemplate(crntSlide.frontmatter.footer, Config.slides.slideFooterTemplate, 'Footer template error'),
          messageHandler.request<string>(WebViewMessages.toVscode.getSetting, Config.slides.slideProgressBar),
        ]);
        const progressPosition = getProgressBarPosition(progressSetting, crntSlide.frontmatter.progress);

        let placeholders: SlidePlaceholders = { slideTitle: getSlideHeading(crntSlide.content) };
        if ((headerTemplate.template || footerTemplate.template || progressPosition) && crntFilePath) {
          const slidePlaceholders = await messageHandler.request<SlidePlaceholders>(
            WebViewMessages.toVscode.preview.getSlidePlaceholders,
            { filePath: crntFilePath, localSlideIdx: crntSlide.index }
          );
          placeholders = { ...slidePlaceholders, ...placeholders };
        }

        if (cancelled) {
          return;
        }

        const data = getTemplateData(crntSlide.frontmatter, placeholders);
        const render = ({ template, html, isSlideTemplate, errorOptions }: Awaited<ReturnType<typeof getTemplate>>) => {
          if (!template || !errorOptions) {
            return html;
          }

          const result = tryConvertTemplateToHtml(template, data, { ...errorOptions, webviewUrl });
          if (result.error) {
            messageHandler.send(WebViewMessages.toVscode.logError, result.error);
          }
          return isSlideTemplate ? DOMPurify.sanitize(result.html, { USE_PROFILES: { html: true } }) : result.html;
        };

        setHeader(render(headerTemplate));
        setFooter(render(footerTemplate));

        const percentage = getProgressPercentage(placeholders.crntSlideIdx, placeholders.totalSlides);
        setProgress(
          progressPosition && percentage !== undefined
            ? { position: progressPosition, crntSlideIdx: placeholders.crntSlideIdx as number, totalSlides: placeholders.totalSlides as number, percentage }
            : undefined
        );
      } catch {
        if (!cancelled) {
          setHeader(undefined);
          setFooter(undefined);
          setProgress(undefined);
        }
      }
    };

    update();

    return () => {
      cancelled = true;
    };
  }, [crntSlide, crntFilePath, webviewUrl, getTemplate]);

  React.useEffect(() => {
    Messenger.listen(slidesListener);

    const crntIdx = crntSlide?.index ?? 0;
    const nextSlideIdx = slides?.length > 1 ? getNextSlideIdx(slides, crntIdx, skipHidden) : undefined;
    const previousSlideIdx = slides?.length > 1 ? getPreviousSlideIdx(slides, crntIdx, skipHidden) : undefined;

    messageHandler.send(WebViewMessages.toVscode.hasNextSlide, nextSlideIdx !== undefined);
    messageHandler.send(WebViewMessages.toVscode.hasPreviousSlide, previousSlideIdx !== undefined);
    messageHandler.send(
      WebViewMessages.toVscode.nextSlideTitle,
      nextSlideIdx !== undefined ? getSlideTitle(slides[nextSlideIdx]) : undefined
    );

    return () => {
      Messenger.unlisten(slidesListener);
    };
  }, [slides, crntSlide, skipHidden, slidesListener]);

  React.useEffect(() => {
    getFileContents(fileUri);
  }, [fileUri, getFileContents]);

  // Every slide starts with its own click steps
  React.useEffect(() => {
    resetClickSteps(revealClickStepsRef.current);
    revealClickStepsRef.current = false;
  }, [crntFilePath, crntSlide?.index]);

  // ESC key handler for zoom (capture phase so it wins over the presentation view Escape handler)
  React.useEffect(() => {
    if (!isZoomed) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        event.stopPropagation();
        toggleZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
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
          onDoubleClick={revealSourceOnDoubleClick}
          style={{
            // Center the slide below the bar of a hidden slide
            top: offsetTop ? `calc(50% + ${offsetTop / 2}px)` : undefined,
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
                  <video autoPlay={getVideoAutoplay(crntSlide?.frontmatter)} loop muted playsInline preload="auto" src={videoUrl}></video>
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
                    skipAnimation={crntSlide.frontmatter.skipAnimation}
                    invertLightAndDarkColours={crntSlide.frontmatter.invertLightAndDarkColours}
                    controlsPosition={crntSlide.frontmatter.controlsPosition}
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

            {
              progress && (
                <div
                  className={`slide__progress slide__progress--${progress.position}`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={progress.totalSlides}
                  aria-valuenow={progress.crntSlideIdx}
                >
                  <div className="slide__progress__bar" style={{ width: `${progress.percentage}%` }}></div>
                </div>
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

          {
            // Marks the edges of a hidden slide without covering its content
            showHiddenMarker && (
              <div
                className="slide__hidden pointer-events-none absolute inset-0 z-40"
                style={{ border: '4px dashed var(--vscode-editorWarning-foreground)' }}
              ></div>
            )
          }

          {
            // Shows where the slide ends and where its content is cut off
            showOverflowWarning && hasSlideOverflow(overflow) && overflow.edges && (
              <SlideOverflowMarker edges={overflow.edges} area={liveFit.area} />
            )
          }
        </div>

        {
          showHiddenMarker && (
            <div
              className="slide__hidden-bar absolute top-0 left-0 right-0 z-30 flex items-center justify-center gap-2 px-4 text-sm whitespace-nowrap overflow-hidden pointer-events-none"
              style={{
                height: HIDDEN_BAR_HEIGHT,
                backgroundColor: 'var(--vscode-editorWarning-foreground)',
                color: 'var(--vscode-editor-background)',
              }}
            >
              {/* The icon has its own color, so it needs to inherit the label color */}
              <Icon name={'eye-closed' as never} className="inline-flex justify-center items-center" style={{ color: 'inherit', fontSize: '16px' }} />
              <span className="font-semibold">Hidden slide</span>
              <span className="opacity-80 truncate">· skipped while presenting</span>
            </div>
          )
        }

        {
          showOverflowWarning && (
            <SlideFitBadge overflow={overflow} autoFit={autoFit} zoom={liveFit.zoom} top={offsetTop + 8} />
          )
        }

        <SlideControls
          show={showControls && cursorVisible}
          path={relativePath}
          slides={slides.length}
          currentSlide={crntSlide?.index}
          slideOptions={slideOptions}
          slideData={slides}
          vsCodeTheme={vsCodeTheme as never}
          isDarkTheme={isDarkTheme}
          webviewUrl={webviewUrl}
          filePath={crntFilePath}
          updateSlideIdx={updateSlideIdx}
          onNavigateToSlide={navigateToSlide}
          triggerMouseMove={setIsMouseMoveEnabled}
          hideControls={hidePreviewControls}
          laserPointerEnabled={laserPointerEnabled}
          onLaserPointerToggle={setLaserPointerEnabled}
          isZoomed={isZoomed}
          onZoomToggle={toggleZoom}
          style={{ cursor: 'default' }}
          matter={crntSlide?.frontmatter}
          notes={crntSlide?.notes}
          clickStep={clickStep}
        >
          {/* Mouse Position */}
          {mousePosition && showControls && cursorVisible && (
            <div className="mouse-position text-sm px-2 py-1 text-(--vscode-editorWidget-foreground)">
              X: {mousePosition.x}, Y: {mousePosition.y}
            </div>
          )}
        </SlideControls>
      </div>

      {
        // Outside the slide, so the theme of the current slide doesn't style the measured slides
        showOverflowWarning && (
          <SlideOverflowScanner
            slides={slides}
            filePath={crntFilePath}
            vsCodeTheme={vsCodeTheme as never}
            isDarkTheme={isDarkTheme}
            webviewUrl={webviewUrl}
            onScanned={onSlidesScanned}
          />
        )
      }
    </>
  );
};

