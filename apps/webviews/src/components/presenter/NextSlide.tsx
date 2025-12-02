import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { EventData } from '@estruyf/vscode';
import { Config, Demo, WebViewMessages } from '@demotime/common';
import { DemoHeader } from './DemoHeader';
import { Icon } from 'vscrui';

export interface INextSlideProps { }

export const NextSlide: React.FunctionComponent<INextSlideProps> = () => {
  const [scale, setScale] = React.useState(1);
  const [apiPort, setApiPort] = React.useState<number | undefined>(undefined);
  const [apiEnabled, setApiEnabled] = React.useState<boolean>(false);
  const [nextTitle, setNextTitle] = React.useState<string | undefined>(undefined);
  const [hasNext, setHasNext] = React.useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('presenterNextSlideCollapsed');
      return stored ? JSON.parse(stored) : false;
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
      const scaleWidth = width / 960;
      const scaleHeight = height / 540;
      const newScale = Math.min(scaleWidth, scaleHeight);
      setScale(newScale);
    }
  }, []);

  const messageListener = React.useCallback((message: MessageEvent<EventData<unknown>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateNextDemo) {
      const demo = payload as Demo | undefined;
      setNextTitle(demo?.title);
      setHasNext(!!demo);
    } else if (command === WebViewMessages.toWebview.preview.updateNextStep) {
      const payloadObj = payload as { title: string; command: string } | undefined;
      if (payloadObj?.title) {
        setNextTitle(payloadObj.title);
        setHasNext(true);
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
      setNextTitle(demo?.title);
      setHasNext(!!demo);
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

  if (!apiEnabled || !apiPort || !hasNext) {
    return null;
  }

  const previewUrl = `http://localhost:${apiPort}/preview`;

  return (
    <div className="rounded-[2px] border border-(--vscode-panel-border) shadow-xs flex flex-col overflow-hidden">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleCollapsed}
          className="text-(--vscode-foreground) hover:opacity-80 transition-opacity p-1 rounded ml-4"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <Icon
            name={isCollapsed ? 'chevron-right' : 'chevron-down'}
            className="text-inherit!"
          />
        </button>
        <DemoHeader title={nextTitle ? `Next: ${nextTitle}` : 'Next Slide'} />
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
              width: '960px',
              height: '540px',
              transform: `scale(${scale})`,
              transformOrigin: 'top left'
            }}
          />
        </div>
      )}
    </div>
  );
};
