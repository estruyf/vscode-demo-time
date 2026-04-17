import * as React from 'react';
import { Slide } from '@demotime/common';
import { Icon } from 'vscrui';
import { SlideThumbnail } from './SlideThumbnail';

export interface SlideOption {
  index: number;
  title: string;
}

export interface ISlideNavigatorProps {
  slides: number;
  currentSlide: number;
  slideOptions: SlideOption[];
  slideData: Slide[];
  vsCodeTheme: never;
  isDarkTheme: boolean;
  webviewUrl: string | null;
  filePath?: string;
  theme?: string;
  onNavigate: (index: number) => void;
  onOpenChange?: (isOpen: boolean) => void;
}

export const SlideNavigator: React.FunctionComponent<ISlideNavigatorProps> = ({
  slides,
  currentSlide,
  slideOptions,
  slideData,
  vsCodeTheme,
  isDarkTheme,
  webviewUrl,
  filePath,
  theme,
  onNavigate,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [thumbnailScale, setThumbnailScale] = React.useState(0.25);

  const toggleOpen = React.useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  React.useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Compute thumbnail scale based on container width
  React.useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updateScale = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      // 3 columns with gap (3 * 12px gap = 36px) and padding (2 * 16px = 32px)
      const cardWidth = (containerWidth - 36 - 32) / 3;
      setThumbnailScale(cardWidth / 960);
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  // Scroll current slide into view when opened
  React.useEffect(() => {
    if (isOpen && gridRef.current) {
      const activeItem = gridRef.current.querySelector('[data-active="true"]');
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen]);

  // ESC to close (capture phase to intercept before presentation close)
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  const handleSelect = React.useCallback(
    (index: number) => {
      onNavigate(index);
      setIsOpen(false);
    },
    [onNavigate],
  );

  const handleBackdropClick = React.useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  }, []);

  return (
    <>
      <button
        onClick={toggleOpen}
        className="flex items-center gap-1 text-sm px-2 py-1 rounded-xs text-(--vscode-editorWidget-foreground) hover:bg-(--vscode-toolbar-hoverBackground) cursor-pointer"
        title="Navigate to slide"
      >
        <span>
          Slide {currentSlide + 1} / {slides}
        </span>
        <Icon
          name={(isOpen ? 'chevron-down' : 'chevron-up') as never}
          className="text-(--vscode-editorWidget-foreground)! inline-flex justify-center items-center"
        />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: 'var(--vscode-editor-background)' }}
          onClick={handleBackdropClick}
        >
          <div
            ref={containerRef}
            className="w-[90%] max-w-[900px] max-h-[80vh] rounded-md overflow-hidden flex flex-col"
            style={{
              backgroundColor: 'var(--vscode-editorWidget-background)',
              border: '1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border))',
              boxShadow: '0 8px 32px var(--vscode-widget-shadow)',
              // Pass scale to thumbnails via CSS variable
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ['--thumbnail-scale' as any]: thumbnailScale,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{
                borderBottom: '1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border))',
              }}
            >
              <span className="text-sm font-medium text-(--vscode-editorWidget-foreground)">
                Go to Slide
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-(--vscode-editorWidget-foreground) hover:bg-(--vscode-toolbar-hoverBackground) rounded-xs p-1 cursor-pointer"
                title="Close"
              >
                <Icon name={'close' as never} className="inline-flex justify-center items-center" />
              </button>
            </div>

            {/* Slide grid */}
            <div ref={gridRef} className="overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-3">
                {slideOptions.map((option) => {
                  const isActive = option.index === currentSlide;
                  const slide = slideData[option.index];
                  return (
                    <button
                      key={option.index}
                      data-active={isActive}
                      onClick={() => handleSelect(option.index)}
                      className={`relative rounded-sm overflow-hidden cursor-pointer transition-all duration-150 text-left group ${isActive
                        ? 'ring-2 ring-(--vscode-focusBorder)'
                        : 'hover:ring-1 hover:ring-(--vscode-focusBorder)'
                        }`}
                      style={{
                        border: '1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border))',
                      }}
                    >
                      {/* Slide thumbnail */}
                      {slide ? (
                        <SlideThumbnail
                          slide={slide}
                          vsCodeTheme={vsCodeTheme}
                          isDarkTheme={isDarkTheme}
                          webviewUrl={webviewUrl}
                          filePath={filePath}
                          theme={theme}
                        />
                      ) : (
                        <div
                          className="aspect-video flex items-center justify-center"
                          style={{ backgroundColor: 'var(--vscode-editor-background)' }}
                        >
                          <span
                            className="text-3xl font-light"
                            style={{
                              color: 'var(--vscode-editorWidget-foreground)',
                              opacity: 0.3,
                            }}
                          >
                            {option.index + 1}
                          </span>
                        </div>
                      )}

                      {/* Title bar */}
                      <div
                        className="px-2.5 py-1.5"
                        style={{
                          backgroundColor: isActive
                            ? 'var(--vscode-list-activeSelectionBackground)'
                            : 'var(--vscode-editorWidget-background)',
                          borderTop: '1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border))',
                        }}
                      >
                        <p
                          className="text-xs truncate"
                          style={{
                            color: isActive
                              ? 'var(--vscode-list-activeSelectionForeground)'
                              : 'var(--vscode-editorWidget-foreground)',
                          }}
                        >
                          {option.title}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
