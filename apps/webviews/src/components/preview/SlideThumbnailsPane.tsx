import * as React from 'react';
import { getDropIndex, moveArrayItem, Slide, SlideLayout } from '@demotime/common';
import { Icon } from 'vscrui';
import { SlideThumbnail } from './SlideThumbnail';
import { getSlideOptionLabels, SlideOption } from './SlideNavigator';

export interface ISlideThumbnailsPaneProps {
  slides: Slide[];
  slideOptions: SlideOption[];
  currentSlide: number;
  /**
   * The path of the slide file for the context menu
   */
  relativePath: string;
  filePath?: string;
  vsCodeTheme: never;
  isDarkTheme: boolean;
  webviewUrl: string | null;
  onNavigate: (index: number) => void;
  /**
   * Moves a slide to another position in the file
   * @returns Whether the file changed
   */
  onMoveSlide: (fromIndex: number, toIndex: number) => Promise<boolean>;
}

const SLIDE_WIDTH = 960;
// Height of the zone at the top and bottom of the pane that scrolls the list while dragging
const SCROLL_EDGE = 48;
const MAX_SCROLL_STEP = 24;
const DRAG_TYPE = 'application/x-demotime-slide';
// The width of the pane, changed by dragging its right edge
const WIDTH_KEY = 'slideThumbnailsWidth';
const MIN_WIDTH = 120;
const MAX_WIDTH = 640;
const RESIZE_STEP = 16;

const clampWidth = (width: number) => Math.round(Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH));

const getStoredWidth = (): number | undefined => {
  try {
    const stored = Number(localStorage.getItem(WIDTH_KEY));
    return stored > 0 ? clampWidth(stored) : undefined;
  } catch {
    return undefined;
  }
};

const storeWidth = (width: number | undefined) => {
  try {
    if (width === undefined) {
      localStorage.removeItem(WIDTH_KEY);
    } else {
      localStorage.setItem(WIDTH_KEY, String(width));
    }
  } catch {
    // The width is only kept for this session
  }
};

interface ILazySlideThumbnailProps {
  slide: Slide;
  title: string;
  vsCodeTheme: never;
  isDarkTheme: boolean;
  webviewUrl: string | null;
  filePath?: string;
}

/**
 * Renders the thumbnail once it is (almost) in view, and keeps it after that.
 */
const LazySlideThumbnail: React.FunctionComponent<ILazySlideThumbnailProps> = ({
  title,
  ...thumbnailProps
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (isVisible || !element) {
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { root: element.closest('aside'), rootMargin: '400px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [isVisible]);

  if (isVisible) {
    return <SlideThumbnail {...thumbnailProps} />;
  }

  return (
    <div
      ref={ref}
      className="w-full aspect-video flex items-center justify-center p-2"
      style={{ backgroundColor: 'var(--vscode-editor-background)' }}
    >
      <span
        className="text-xs truncate"
        style={{ color: 'var(--vscode-editorWidget-foreground)', opacity: 0.5 }}
      >
        {title}
      </span>
    </div>
  );
};

interface IItemProps {
  slide: Slide;
  option: SlideOption;
  /**
   * The position in the list
   */
  position: number;
  /**
   * The index of the slide in the file
   */
  index: number;
  total: number;
  isActive: boolean;
  isDragging: boolean;
  isBusy: boolean;
  showLineBefore: boolean;
  showLineAfter: boolean;
  relativePath: string;
  filePath?: string;
  vsCodeTheme: never;
  isDarkTheme: boolean;
  webviewUrl: string | null;
  onSelect: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, position: number) => void;
}

const DropLine: React.FunctionComponent<{ position: 'top' | 'bottom' }> = ({ position }) => (
  <div
    aria-hidden="true"
    className={`absolute left-0 right-0 h-0.5 pointer-events-none z-10 ${
      position === 'top' ? '-top-px' : '-bottom-px'
    }`}
    style={{
      backgroundColor: 'var(--vscode-list-dropBetweenBackground, var(--vscode-focusBorder))',
    }}
  />
);

const SlideThumbnailsPaneItem: React.FunctionComponent<IItemProps> = ({
  slide,
  option,
  position,
  index,
  total,
  isActive,
  isDragging,
  isBusy,
  showLineBefore,
  showLineAfter,
  relativePath,
  filePath,
  vsCodeTheme,
  isDarkTheme,
  webviewUrl,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragOver,
}) => {
  const { overflowMessage, tooltip } = getSlideOptionLabels(option, slide);

  const vscodeContext = React.useMemo(
    () =>
      JSON.stringify({
        webviewSection: 'slide',
        slidePath: relativePath,
        slideIndex: index,
        slideHidden: !!option.hidden,
        slideLayout: slide.frontmatter.layout || SlideLayout.Default,
        slideIsFirst: index === 0,
        slideIsLast: index === total - 1,
      }),
    [relativePath, index, option.hidden, slide.frontmatter.layout, total],
  );

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(DRAG_TYPE, String(index));
    e.dataTransfer.effectAllowed = 'move';
    // Dim the item after the browser took the drag image
    setTimeout(() => onDragStart(index), 0);
  };

  return (
    <div
      id={`slide-thumb-${index}`}
      role="option"
      aria-selected={isActive}
      aria-label={`Slide ${position + 1}: ${option.title}`}
      title={tooltip ? `${option.title} (${tooltip})` : option.title}
      data-active={isActive}
      data-hidden={option.hidden}
      data-overflow={!!option.overflow}
      data-vscode-context={vscodeContext}
      draggable={!isBusy}
      className={`relative flex items-start gap-1.5 px-2 py-1.5 cursor-pointer ${
        isDragging ? 'opacity-40' : ''
      }`}
      onClick={(e) => {
        // Keep the focus on the list for the keyboard support
        (e.currentTarget.parentElement as HTMLElement | null)?.focus();
        onSelect(index);
      }}
      onContextMenu={() => {
        // The menu is for the slide you right-click
        if (!isActive) {
          onSelect(index);
        }
      }}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, position)}
    >
      {showLineBefore && <DropLine position="top" />}
      <div
        className="flex flex-col items-end gap-1 w-5 shrink-0 text-xs tabular-nums"
        style={{ color: 'var(--vscode-sideBar-foreground, var(--vscode-foreground))' }}
      >
        <span>{position + 1}</span>
        {option.hidden && (
          <Icon
            name={'eye-closed' as never}
            className="inline-flex justify-center items-center"
            style={{ color: 'inherit', fontSize: '12px' }}
          />
        )}
      </div>
      <div
        data-thumb-box
        className={`relative flex-1 min-w-0 overflow-hidden rounded-xs ${
          isActive
            ? 'ring-2 ring-(--vscode-focusBorder)'
            : 'hover:ring-1 hover:ring-(--vscode-focusBorder)'
        }`}
        style={{
          border: '1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border))',
        }}
      >
        <div style={{ opacity: option.hidden ? 0.4 : 1 }}>
          <LazySlideThumbnail
            slide={slide}
            title={option.title}
            vsCodeTheme={vsCodeTheme}
            isDarkTheme={isDarkTheme}
            webviewUrl={webviewUrl}
            filePath={filePath}
          />
        </div>
        {overflowMessage && (
          <Icon
            name={'warning' as never}
            className="absolute bottom-0.5 right-0.5 inline-flex justify-center items-center"
            style={{ color: 'var(--vscode-editorWarning-foreground)', fontSize: '14px' }}
            aria-label={overflowMessage}
          />
        )}
      </div>
      {showLineAfter && <DropLine position="bottom" />}
    </div>
  );
};

/**
 * The thumbnails of the slides of the file on the left of the slide preview: click one to open the
 * slide, or drag it to change the order of the slides.
 */
export const SlideThumbnailsPane: React.FunctionComponent<ISlideThumbnailsPaneProps> = ({
  slides,
  slideOptions,
  currentSlide,
  relativePath,
  filePath,
  vsCodeTheme,
  isDarkTheme,
  webviewUrl,
  onNavigate,
  onMoveSlide,
}) => {
  const listRef = React.useRef<HTMLDivElement>(null);
  const paneRef = React.useRef<HTMLDivElement>(null);
  // Without a width of its own, the pane follows the width of the preview
  const [width, setWidth] = React.useState<number | undefined>(getStoredWidth);
  const [isResizing, setIsResizing] = React.useState(false);
  const [pendingMove, setPendingMove] = React.useState<{ from: number; to: number } | null>(null);
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);
  const [insertionIndex, setInsertionIndex] = React.useState<number | null>(null);
  const total = slides.length;
  const isBusy = pendingMove !== null;

  // The file was saved, so the slides have their new order
  React.useEffect(() => {
    setPendingMove(null);
  }, [slides]);

  // The slide indexes in the order of the list. It follows the move right away, and not once the
  // file is saved.
  const displayed = React.useMemo(() => {
    const indices = slides.map((_, idx) => idx);
    return pendingMove ? moveArrayItem(indices, pendingMove.from, pendingMove.to) : indices;
  }, [slides, pendingMove]);

  // The key follows the slide, so React moves the thumbnail on a reorder instead of rendering it again
  const keys = React.useMemo(() => {
    const occurrences = new Map<string, number>();
    return slides.map((slide) => {
      const base = JSON.stringify([slide.content, slide.frontmatter, slide.notes]);
      const occurrence = occurrences.get(base) ?? 0;
      occurrences.set(base, occurrence + 1);
      return `${base}#${occurrence}`;
    });
  }, [slides]);

  // Scale the slides to the width of the thumbnails
  React.useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') {
      return;
    }

    const updateScale = () => {
      const box = list.querySelector<HTMLElement>('[data-thumb-box]');
      if (box && box.clientWidth > 0) {
        list.style.setProperty('--thumbnail-scale', `${box.clientWidth / SLIDE_WIDTH}`);
      }
    };
    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(list);
    return () => observer.disconnect();
  }, [total]);

  // Show the current slide
  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`#slide-thumb-${currentSlide}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [currentSlide]);

  const requestMove = React.useCallback(
    async (from: number, to: number) => {
      if (pendingMove || to === from || from < 0 || to < 0 || from >= total || to >= total) {
        return;
      }

      setPendingMove({ from, to });
      const isMoved = await onMoveSlide(from, to);
      if (!isMoved) {
        setPendingMove(null);
      }
    },
    [pendingMove, total, onMoveSlide],
  );

  const resetDrag = React.useCallback(() => {
    setDraggingIndex(null);
    setInsertionIndex(null);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let handler: (() => void) | undefined;
    if (e.altKey && e.key === 'ArrowUp') {
      handler = () => requestMove(currentSlide, currentSlide - 1);
    } else if (e.altKey && e.key === 'ArrowDown') {
      handler = () => requestMove(currentSlide, currentSlide + 1);
    } else if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      const select = (index: number) => () => onNavigate(Math.min(Math.max(index, 0), total - 1));
      if (e.key === 'ArrowUp') {
        handler = select(currentSlide - 1);
      } else if (e.key === 'ArrowDown') {
        handler = select(currentSlide + 1);
      } else if (e.key === 'Home') {
        handler = select(0);
      } else if (e.key === 'End') {
        handler = select(total - 1);
      }
    }

    if (handler) {
      e.preventDefault();
      e.stopPropagation();
      handler();
    }
  };

  const hasSlideDrag = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes(DRAG_TYPE);

  const handleItemDragOver = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    if (!hasSlideDrag(e)) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    setInsertionIndex(e.clientY < rect.top + rect.height / 2 ? position : position + 1);
  };

  const handleListDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // The space above the first or below the last thumbnail
    if (e.target === e.currentTarget && hasSlideDrag(e)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const first = e.currentTarget.firstElementChild;
      const isAbove = !!first && e.clientY < first.getBoundingClientRect().top;
      setInsertionIndex(isAbove ? 0 : total);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasSlideDrag(e)) {
      return;
    }
    e.preventDefault();
    const from = Number(e.dataTransfer.getData(DRAG_TYPE));
    const to = insertionIndex;
    resetDrag();
    if (Number.isInteger(from) && to !== null) {
      requestMove(from, getDropIndex(from, to));
    }
  };

  // Scroll the list when you drag a slide close to the top or bottom of the pane. The browser only
  // does this in a few pixels at the edge of the webview.
  const handleAutoScroll = (e: React.DragEvent<HTMLElement>) => {
    if (!hasSlideDrag(e)) {
      return;
    }
    const pane = e.currentTarget;
    const rect = pane.getBoundingClientRect();
    const fromTop = e.clientY - rect.top;
    const fromBottom = rect.bottom - e.clientY;
    if (fromTop < SCROLL_EDGE) {
      pane.scrollTop -= Math.ceil(((SCROLL_EDGE - fromTop) / SCROLL_EDGE) * MAX_SCROLL_STEP);
    } else if (fromBottom < SCROLL_EDGE) {
      pane.scrollTop += Math.ceil(((SCROLL_EDGE - fromBottom) / SCROLL_EDGE) * MAX_SCROLL_STEP);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setInsertionIndex(null);
    }
  };

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !paneRef.current) {
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startWidth = paneRef.current.getBoundingClientRect().width;
    const handle = e.currentTarget;
    setIsResizing(true);

    const onMove = (event: PointerEvent) => {
      setWidth(clampWidth(startWidth + event.clientX - startX));
    };
    const onEnd = (event: PointerEvent) => {
      handle.releasePointerCapture(event.pointerId);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onEnd);
      handle.removeEventListener('pointercancel', onEnd);
      setIsResizing(false);
      setWidth((value) => {
        storeWidth(value);
        return value;
      });
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onEnd);
    handle.addEventListener('pointercancel', onEnd);
  };

  const handleResizeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
      return;
    }
    // Don't move to another slide
    e.preventDefault();
    e.stopPropagation();
    const crntWidth = width ?? paneRef.current?.getBoundingClientRect().width ?? MIN_WIDTH;
    const next = clampWidth(crntWidth + (e.key === 'ArrowRight' ? RESIZE_STEP : -RESIZE_STEP));
    setWidth(next);
    storeWidth(next);
  };

  // A double-click on the edge goes back to the default width
  const resetWidth = () => {
    setWidth(undefined);
    storeWidth(undefined);
  };

  // A drop next to the slide itself doesn't change the order
  const lineIndex =
    draggingIndex !== null &&
    insertionIndex !== null &&
    insertionIndex !== draggingIndex &&
    insertionIndex !== draggingIndex + 1
      ? insertionIndex
      : null;

  return (
    <div
      ref={paneRef}
      data-slide-thumbnails
      className={`relative shrink-0 h-full max-w-[50vw] ${
        width === undefined ? 'w-[clamp(140px,18vw,220px)]' : ''
      } ${isResizing ? 'select-none' : ''}`}
      style={width === undefined ? undefined : { width }}
    >
      <aside
        aria-label="Slides"
        className="h-full w-full overflow-y-auto"
        style={{
          backgroundColor: 'var(--vscode-sideBar-background, var(--vscode-editor-background))',
          borderRight: '1px solid var(--vscode-sideBar-border, var(--vscode-widget-border))',
        }}
        onDragOver={handleAutoScroll}
      >
        <div
          ref={listRef}
          role="listbox"
          aria-label="Slide thumbnails"
          tabIndex={0}
          aria-activedescendant={`slide-thumb-${currentSlide}`}
          className="min-h-full py-1 focus-visible:outline-none"
          onKeyDown={handleKeyDown}
          onDragOver={handleListDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {displayed.map((index, position) => (
            <SlideThumbnailsPaneItem
              key={keys[index]}
              slide={slides[index]}
              option={slideOptions[index] ?? { index, title: `Slide ${index + 1}` }}
              position={position}
              index={index}
              total={total}
              isActive={pendingMove ? index === pendingMove.from : index === currentSlide}
              isDragging={draggingIndex === index}
              isBusy={isBusy}
              showLineBefore={lineIndex === position}
              showLineAfter={lineIndex === total && position === total - 1}
              relativePath={relativePath}
              filePath={filePath}
              vsCodeTheme={vsCodeTheme}
              isDarkTheme={isDarkTheme}
              webviewUrl={webviewUrl}
              onSelect={onNavigate}
              onDragStart={setDraggingIndex}
              onDragEnd={resetDrag}
              onDragOver={handleItemDragOver}
            />
          ))}
        </div>
      </aside>
      <div
        role="separator"
        aria-label="Resize slide thumbnails"
        aria-orientation="vertical"
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        aria-valuenow={width}
        title="Drag to resize, double-click to reset"
        tabIndex={0}
        className={`absolute top-0 -right-0.5 z-20 w-1 h-full cursor-col-resize transition-colors hover:bg-(--vscode-focusBorder) focus-visible:outline-none focus-visible:bg-(--vscode-focusBorder) ${
          isResizing ? 'bg-(--vscode-focusBorder)' : ''
        }`}
        onPointerDown={handleResizeStart}
        onKeyDown={handleResizeKeyDown}
        onDoubleClick={resetWidth}
      />
    </div>
  );
};
