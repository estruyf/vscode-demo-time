import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { COMMAND, WebViewMessages } from '../../constants';
import { SlideControl } from './SlideControl';
import { WhiteboardIcon } from './WhiteboardIcon';
import { Icon } from 'vscrui';
import { ProjectorIcon } from './ProjectorIcon';
import { EventData } from '@estruyf/vscode';

export interface ISlideControlsProps {
  show: boolean;
  path?: string;
  slides: number;
  currentSlide?: number;
  updateSlideIdx: (index: number) => void;
  triggerMouseMove: (value: boolean) => void;
  hideCursor: () => void;
}

export const SlideControls: React.FunctionComponent<React.PropsWithChildren<ISlideControlsProps>> = ({
  show,
  path,
  children,
  slides,
  currentSlide = 0,
  updateSlideIdx,
  triggerMouseMove,
  hideCursor
}: React.PropsWithChildren<ISlideControlsProps>) => {
  const [previousEnabled, setPreviousEnabled] = React.useState(false);
  const [isPresentationMode, setIsPresentationMode] = React.useState(false);
  const [showPosition, setShowPosition] = React.useState(false);

  const messageListener = (message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateIsInPresentationMode) {
      setIsPresentationMode(payload);
    }
  };

  const previous = React.useCallback(() => {
    if (slides === 1 && previousEnabled) {
      messageHandler.send(WebViewMessages.toVscode.runCommand, COMMAND.previous);
      return;
    }

    const prevSlide = currentSlide - 1;
    if (prevSlide >= 0) {
      updateSlideIdx(prevSlide);
      messageHandler.send(WebViewMessages.toVscode.updateSlideIndex, prevSlide);
    } else if (previousEnabled) {
      messageHandler.send(WebViewMessages.toVscode.runCommand, COMMAND.previous);
    }
  }, [slides, currentSlide, updateSlideIdx]);

  const next = React.useCallback(() => {
    if (slides === 1) {
      messageHandler.send(WebViewMessages.toVscode.runCommand, COMMAND.start);
      return;
    }

    const nextSlide = currentSlide + 1;
    if (nextSlide < slides) {
      updateSlideIdx(nextSlide);
      messageHandler.send(WebViewMessages.toVscode.updateSlideIndex, nextSlide);
    } else {
      messageHandler.send(WebViewMessages.toVscode.runCommand, COMMAND.start);
    }
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
    messageHandler.send(WebViewMessages.toVscode.runCommand, "demo-time.focus");
  }, []);

  const togglePresentationMode = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, "demo-time.togglePresentationMode");
  }, []);

  const openSlideSource = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.openFile, path);
  }, [path]);

  const hidePresentation = React.useCallback(() => {
    hideCursor();
  }, [hideCursor]);

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

  return (
    <div
      className={`absolute bottom-0 w-full transition-opacity duration-300 ${show ? 'opacity-90' : 'opacity-0 pointer-events-none'
        }`}
    >
      <div
        className="bg-[var(--vscode-editorWidget-background)] p-2 grid grid-cols-3 gap-4"
        style={{ boxShadow: '0 0 8px 0 var(--vscode-widget-shadow)' }}
      >
        <div className='flex items-center'>
          <SlideControl title="Toggle presentation mode" className={`${isPresentationMode ? `bg-[var(--vscode-statusBarItem-errorBackground)] hover:-[var(--vscode-statusBarItem-errorHoverBackground)]` : ''}`} icon={<ProjectorIcon className={`w-4 h-4 inline-flex justify-center items-center ${isPresentationMode ? `text-[var(--vscode-statusBarItem-errorForeground)] hover:text-[var(--vscode-statusBarItem-errorHoverForeground)]` : `text-[var(--vscode-editorWidget-foreground)]`}`} />} action={togglePresentationMode} />
          <SlideControl title="Toggle fullscreen" iconName="screen-full" action={toggleFullscreen} />
          <SlideControl title="Toggle presentation view" icon={<WhiteboardIcon className="w-4 h-4 text-[var(--vscode-editorWidget-foreground)] inline-flex justify-center items-center" />} action={togglePresentationView} />
          <SlideControl title="Hide mouse and action bar" iconName="eye-closed" action={hidePresentation} />
          <SlideControl title="Close sidebar" icon={(
            <div className='relative inline-flex justify-center items-center'>
              <div className='absolute -top-[2px] -right-[2px] w-2 h-2 bg-[var(--vscode-editorWidget-foreground)] rounded-full inline-flex justify-center items-center'>
                <Icon name='close' className='!text-[var(--vscode-editorWidget-background)] block' style={{ fontSize: "8px" }} />
              </div>
              <Icon name='layout-sidebar-left' className='!text-[var(--vscode-editorWidget-foreground)] inline-flex justify-center items-center' />
            </div>
          )} action={closeSidebar} />
          <SlideControl title="Show demos" iconName='list-unordered' action={focusPanel} />
        </div>

        <div className="flex items-center justify-center gap-4">
          {
            (previousEnabled || (slides > 1 && currentSlide >= 1)) ? (
              <SlideControl title="Previous" iconName="arrow-left" action={previous} isSlideControl />
            ) : (
              <div style={{ width: "32px" }} />
            )
          }

          <SlideControl title="Next" iconName="arrow-right" action={next} isSlideControl />
        </div>
        <div className="flex items-center justify-end">
          {slides > 1 && (
            <div className="slide-info text-sm px-2 py-1 text-[var(--vscode-editorWidget-foreground)]">
              Slide {currentSlide + 1} of {slides}
            </div>
          )}

          {
            showPosition && (
              children
            )
          }
          <SlideControl
            title="Toggle mouse position"
            className='-rotate-90 hover:bg-[var(--vscode-toolbar-hoverBackground)]'
            iconName="symbol-ruler"
            action={() => {
              setShowPosition(prev => !prev);
              triggerMouseMove(!showPosition);
            }}
          />
          {
            path && (
              <SlideControl title="Open slide source" iconName="preview" action={openSlideSource} />
            )
          }
        </div>
      </div>
    </div>
  );
};