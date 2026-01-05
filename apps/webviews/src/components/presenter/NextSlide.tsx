import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { EventData } from '@estruyf/vscode';
import { Config, Demo, WebViewMessages, COMMAND, Step, Action } from '@demotime/common';
import { Icon } from 'vscrui';

// Standard 16:9 slide dimensions used for scaling calculations
const SLIDE_WIDTH = 960;
const SLIDE_HEIGHT = 540;

export const NextSlide: React.FunctionComponent = () => {
  const [scale, setScale] = React.useState(1);
  const [apiPort, setApiPort] = React.useState<number | undefined>(undefined);
  const [apiEnabled, setApiEnabled] = React.useState<boolean>(false);
  const [nextTitle, setNextTitle] = React.useState<string | undefined>(undefined);
  const [hasNext, setHasNext] = React.useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('presenterNextSlideCollapsed');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate that parsed value is boolean
        return typeof parsed === 'boolean' ? parsed : false;
      }
      return false;
    } catch {
      return false;
    }
  });

  const divRef = React.useRef<HTMLDivElement>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const toggleCollapsed = React.useCallback(() => {
    setIsCollapsed((prev: boolean) => {
      const newValue = !prev;
      try {
        localStorage.setItem('presenterNextSlideCollapsed', JSON.stringify(newValue));
      } catch {
        // Ignore localStorage errors
      }
      return newValue;
    });
  }, []);

  const updateScale = React.useCallback(() => {
    if (divRef.current) {
      const rect = divRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const scaleWidth = width / SLIDE_WIDTH;
      const scaleHeight = height / SLIDE_HEIGHT;
      const newScale = Math.min(scaleWidth, scaleHeight);
      setScale(newScale);
    }
  }, []);

  const updateNextTitle = (demo: Demo | undefined) => {
    const hasSlides = demo?.steps?.some((s: Step) => s.action === Action.OpenSlide);
    if (hasSlides) {
      setNextTitle(demo?.title);
      setHasNext(!!demo);
    } else {
      setNextTitle(undefined);
      setHasNext(false);
    }
  };

  const messageListener = React.useCallback((message: MessageEvent<EventData<unknown>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    console.log(`PresenterView NextSlide received message: ${command}`, payload);
    if (command === WebViewMessages.toWebview.updateNextDemo) {
      const demo = payload as Demo | undefined;
      updateNextTitle(demo);
    } else if (command === WebViewMessages.toWebview.preview.updateNextStep) {
      const payloadObj = payload as { title: string; command: string } | undefined;
      if (payloadObj?.title) {
        // Hide preview when the next action is running another demo
        if (payloadObj.command === COMMAND.runById) {
          setNextTitle(payloadObj.title);
          setHasNext(false);
        } else {
          setNextTitle(payloadObj.title);
          setHasNext(true);
        }
      }
    } else if (command === WebViewMessages.toWebview.presenter.nextSlide) {
      const slideTitle = payload as string | undefined;
      if (typeof slideTitle === 'string') {
        // Unset first to force re-render even when title is the same empty string
        setNextTitle(undefined);
        setHasNext(true);
        setTimeout(() => {
          setNextTitle(slideTitle);
        }, 0);
      } else {
        setNextTitle(undefined);
        setHasNext(false);
      }
    }
  }, []);

  React.useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
    };
  }, [updateScale]);

  React.useEffect(() => {
    Messenger.listen(messageListener);

    // Check if API is enabled
    messageHandler.request<boolean>(WebViewMessages.toVscode.getSetting, Config.api.enabled).then((enabled) => {
      setApiEnabled(enabled);
    });

    // Get the API port from settings
    messageHandler.request<number | undefined>(WebViewMessages.toVscode.getSetting, Config.api.port).then((port) => {
      setApiPort(port);
    });

    // Get the next demo
    messageHandler.request<Demo | undefined>(WebViewMessages.toVscode.getNextDemo).then((demo) => {
      updateNextTitle(demo);
    });

    return () => {
      Messenger.unlisten(messageListener);
    };
  }, [messageListener]);

  // Refresh the iframe when hasNext changes
  React.useEffect(() => {
    if (hasNext) {
      updateScale();
    }
  }, [hasNext, updateScale]);

  // Refresh iframe when nextTitle changes (force reload via timestamp)
  React.useEffect(() => {
    if (iframeRef.current && apiPort) {
      try {
        const iframe = iframeRef.current;
        const url = new URL(`http://localhost:${apiPort}/preview`);
        url.searchParams.set('t', Date.now().toString());
        iframe.src = url.toString();
      } catch {
        // ignore URL errors
      }
    }
  }, [nextTitle, apiPort]);

  if (!apiEnabled || !apiPort || !hasNext) {
    return null;
  }

  // The API runs on localhost, so HTTP is appropriate for local development
  const previewUrl = `http://localhost:${apiPort}/preview`;

  return (
    <div className="presenter-card rounded-lg border border-(--vscode-panel-border) bg-(--vscode-sideBar-background) shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="presenter-card-header flex items-center gap-2 px-5 py-4 border-b border-(--vscode-panel-border)/50">
        <button
          onClick={toggleCollapsed}
          className="flex-shrink-0 p-1 -ml-1 rounded transition-colors duration-150 hover:bg-(--vscode-list-hoverBackground)"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <Icon
            name={isCollapsed ? 'chevron-right' : 'chevron-down'}
            className="text-(--vscode-descriptionForeground)!"
          />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-5 h-5 text-(--vscode-descriptionForeground)">
            <Icon name="preview" className="text-inherit!" />
          </div>
          <h3 className="text-base font-semibold leading-none tracking-tight text-(--vscode-foreground)">
            {nextTitle ? (
              <>
                <span className="text-(--vscode-descriptionForeground) font-medium">Next: </span>
                {nextTitle}
              </>
            ) : (
              'Next Slide'
            )}
          </h3>
        </div>
      </div>

      {!isCollapsed && (
        <div
          ref={divRef}
          className="aspect-video w-full overflow-hidden relative bg-(--vscode-editor-background)"
        >
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="absolute inset-0 border-0 aspect-video"
            style={{
              width: `${SLIDE_WIDTH}px`,
              height: `${SLIDE_HEIGHT}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left'
            }}
          />
        </div>
      )}
    </div>
  );
};
