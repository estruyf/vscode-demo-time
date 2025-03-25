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
  const { cursorVisible, resetCursorTimeout } = useCursor();
  const { vsCodeTheme } = useTheme();
  useScale(ref, slideRef);

  const messageListener = (message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.triggerUpdate) {
      getFileContents(payload);
    }
  };

  const getBgStyles = React.useCallback(() => {
    if (!layout || layout === SlideLayout.ImageLeft || layout === SlideLayout.ImageRight) {
      return undefined;
    }

    return bgStyles;
  }, [bgStyles, layout]);

  const handleMouseMove = React.useCallback(() => {
    resetCursorTimeout();
  }, [resetCursorTimeout]);

  React.useEffect(() => {
    getFileContents(fileUri);
  }, [fileUri]);

  React.useEffect(() => {
    Messenger.listen(messageListener);

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
              content && vsCodeTheme ? (
                <div className='slide__content'>
                  {
                    <Markdown
                      filePath={crntFilePath}
                      content={content}
                      vsCodeTheme={vsCodeTheme}
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

        <SlideControls show={showControls && cursorVisible} path={crntFilePath} />
      </div>
    </>
  );
};