import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { COMMAND, Slide, SlideMetadata } from '@demotime/common';
import { SlideControl } from './SlideControl';
import { WhiteboardIcon } from './WhiteboardIcon';
import { ProjectorIcon } from './ProjectorIcon';
import { EventData } from '@estruyf/vscode';
import { WebViewMessages } from '@demotime/common';
import { SlideNavigator, SlideOption } from './SlideNavigator';
import { SlideControlsMenu, ISlideMenuGroup, ISlideMenuItem } from './SlideControlsMenu';
import { cn } from '../../utils/cn';

export interface ISlideControlsProps {
  show: boolean;
  path?: string;
  slides: number;
  currentSlide?: number;
  slideOptions?: SlideOption[];
  slideData?: Slide[];
  vsCodeTheme?: never;
  isDarkTheme?: boolean;
  webviewUrl?: string | null;
  filePath?: string;
  slideTheme?: string;
  updateSlideIdx: (index: number) => void;
  onNavigateToSlide?: (index: number) => void;
  triggerMouseMove: (value: boolean) => void;
  hideControls: () => void;
  laserPointerEnabled?: boolean;
  onLaserPointerToggle?: (enabled: boolean) => void;
  isZoomed?: boolean;
  onZoomToggle?: () => void;
  style?: React.CSSProperties;
  matter?: SlideMetadata;
}

const Divider: React.FunctionComponent = () => (
  <div
    aria-hidden="true"
    className="w-px self-stretch my-1 bg-(--vscode-editorWidget-foreground) opacity-20"
  />
);

export const SlideControls: React.FunctionComponent<React.PropsWithChildren<ISlideControlsProps>> = ({
  show,
  path,
  children,
  slides,
  currentSlide = 0,
  slideOptions,
  slideData,
  vsCodeTheme,
  isDarkTheme,
  webviewUrl,
  filePath,
  slideTheme,
  updateSlideIdx,
  onNavigateToSlide,
  triggerMouseMove,
  hideControls,
  laserPointerEnabled = false,
  onLaserPointerToggle,
  isZoomed = false,
  onZoomToggle,
  style,
  matter
}: React.PropsWithChildren<ISlideControlsProps>) => {
  const [previousEnabled, setPreviousEnabled] = React.useState(false);
  const [isPresentationMode, setIsPresentationMode] = React.useState(false);
  const [showPosition, setShowPosition] = React.useState(false);
  const [isNavigatorOpen, setIsNavigatorOpen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [extensionAutoProceedManaged, setExtensionAutoProceedManaged] = React.useState(false);


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messageListener = (message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateIsInPresentationMode) {
      setIsPresentationMode(payload);
    } else if (command === WebViewMessages.toWebview.updateAutoProceedState) {
      setExtensionAutoProceedManaged(!!payload?.managedByExtension);
    }
  };

  const previous = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, COMMAND.previous);
  }, [slides, currentSlide, updateSlideIdx, previousEnabled]);

  const next = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, COMMAND.start);
  }, [slides, currentSlide, updateSlideIdx]);

  const toggleFullscreen = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, "workbench.action.toggleFullScreen");
  }, []);

  const togglePresentationView = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, COMMAND.togglePresentationView);
  }, []);

  const closeSidebar = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, "workbench.action.closeSidebar");
  }, []);

  const focusPanel = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, "demo-time-scenes.focus");
  }, []);

  const togglePresentationMode = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, "demo-time.togglePresentationMode");
  }, []);

  const openSlideSource = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.openFile, path);
  }, [path]);

  const toggleMousePosition = React.useCallback(() => {
    const nextValue = !showPosition;
    setShowPosition(nextValue);
    triggerMouseMove(nextValue);
  }, [showPosition, triggerMouseMove]);

  const toggleLaserPointer = React.useCallback(() => {
    onLaserPointerToggle?.(!laserPointerEnabled);
  }, [laserPointerEnabled, onLaserPointerToggle]);

  const toggleZoom = React.useCallback(() => {
    onZoomToggle?.();
  }, [onZoomToggle]);

  React.useEffect(() => {
    // Always clear previous timer on effect run
    let timer: NodeJS.Timeout | undefined;
    if (!extensionAutoProceedManaged && matter?.autoAdvanceAfter && matter.autoAdvanceAfter > 0) {
      timer = setTimeout(() => {
        next();
      }, matter.autoAdvanceAfter * 1000);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [extensionAutoProceedManaged, matter?.autoAdvanceAfter, currentSlide]);

  React.useEffect(() => {
    if (show) {
      messageHandler.request<boolean>(WebViewMessages.toVscode.getPreviousEnabled).then((previous) => {
        setPreviousEnabled(previous);
      });
    }
  }, [show]);

  React.useEffect(() => {
    messageHandler.request<boolean>(WebViewMessages.toVscode.getPresentationStarted).then((value) => {
      setIsPresentationMode(value);
    });

    Messenger.listen(messageListener);

    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  const hasMultipleSlides = slides > 1;
  const canPrevious = previousEnabled || (hasMultipleSlides && currentSlide >= 1);
  const showPrevious = hasMultipleSlides || previousEnabled;
  const hasNavigator = hasMultipleSlides && !!slideOptions && slideOptions.length > 0;

  // Secondary actions live in the overflow menu so the bar stays compact and discoverable.
  const menuGroups = React.useMemo<ISlideMenuGroup[]>(() => {
    const groups: ISlideMenuGroup[] = [];

    const slideItems: ISlideMenuItem[] = [];
    if (!isPresentationMode) {
      slideItems.push({
        id: 'mouse-position',
        label: 'Mouse position',
        iconName: 'symbol-ruler',
        pressed: showPosition,
        onSelect: toggleMousePosition,
      });
      if (path) {
        slideItems.push({
          id: 'open-slide-source',
          label: 'Open slide source',
          iconName: 'file-code',
          onSelect: openSlideSource,
        });
      }
    }
    if (slideItems.length > 0) {
      groups.push({ id: 'slide', label: 'Slide', items: slideItems });
    }

    groups.push({
      id: 'workspace',
      label: 'Workspace',
      items: [
        { id: 'show-demos', label: 'Show demos', iconName: 'list-unordered', onSelect: focusPanel },
        { id: 'close-sidebar', label: 'Close sidebar', iconName: 'layout-sidebar-left', onSelect: closeSidebar },
      ],
    });

    groups.push({
      id: 'view',
      items: [{ id: 'hide-controls', label: 'Hide controls', iconName: 'eye-closed', onSelect: hideControls }],
    });

    return groups;
  }, [isPresentationMode, showPosition, path, toggleMousePosition, openSlideSource, focusPanel, closeSidebar, hideControls]);

  const isOverlayOpen = isNavigatorOpen || isMenuOpen;
  const visible = show || isOverlayOpen;

  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 w-full flex justify-center px-4 pb-4 pointer-events-none transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      style={style}
    >
      <div
        role="toolbar"
        aria-label="Slide controls"
        className={cn(
          'inline-flex items-center gap-1 rounded-2xl px-2 py-1.5 max-w-full',
          'bg-(--vscode-editorWidget-background)',
          visible ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        style={{
          border: '1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border))',
          boxShadow: '0 0 12px 0 var(--vscode-widget-shadow)',
        }}
      >
        {/* View tools */}
        <div className="flex items-center gap-0.5">
          <SlideControl
            title="Toggle presentation mode"
            active={isPresentationMode}
            icon={<ProjectorIcon className="w-4 h-4" />}
            ariaPressed={isPresentationMode}
            action={togglePresentationMode}
          />
          <SlideControl
            title="Toggle presentation view"
            icon={<WhiteboardIcon className="w-4 h-4" />}
            action={togglePresentationView}
          />
          <SlideControl title="Toggle fullscreen" iconName="screen-full" action={toggleFullscreen} />
        </div>

        <Divider />

        {/* Slide navigation */}
        <div className="flex items-center justify-center gap-1">
          {showPrevious ? (
            <SlideControl title="Previous" iconName="arrow-left" action={previous} disabled={!canPrevious} isSlideControl />
          ) : (
            <div style={{ width: '32px' }} />
          )}

          {hasNavigator ? (
            <SlideNavigator
              slides={slides}
              currentSlide={currentSlide}
              slideOptions={slideOptions}
              slideData={slideData || []}
              vsCodeTheme={vsCodeTheme as never}
              isDarkTheme={isDarkTheme || false}
              webviewUrl={webviewUrl || null}
              filePath={filePath}
              theme={slideTheme}
              onNavigate={onNavigateToSlide || updateSlideIdx}
              onOpenChange={setIsNavigatorOpen}
            />
          ) : hasMultipleSlides ? (
            <div className="slide-info text-sm px-2 py-1 tabular-nums text-(--vscode-editorWidget-foreground)">
              <span className="font-semibold">{String(currentSlide + 1).padStart(2, '0')}</span>
              <span className="opacity-50"> / {String(slides).padStart(2, '0')}</span>
            </div>
          ) : null}

          <SlideControl title="Next" iconName="arrow-right" action={next} isSlideControl />
        </div>

        <Divider />

        {/* Slide tools */}
        <div className="flex items-center gap-0.5">
          {showPosition && children}

          <SlideControl
            title="Toggle laser pointer"
            iconName="record"
            active={laserPointerEnabled}
            ariaPressed={laserPointerEnabled}
            action={toggleLaserPointer}
          />
          <SlideControl
            title={isZoomed ? 'Exit zoom' : 'Zoom in'}
            iconName={isZoomed ? 'zoom-out' : 'zoom-in'}
            active={isZoomed}
            ariaPressed={isZoomed}
            action={toggleZoom}
          />

          <SlideControlsMenu groups={menuGroups} onOpenChange={setIsMenuOpen} />
        </div>
      </div>
    </div>
  );
};
