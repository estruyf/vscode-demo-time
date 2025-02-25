import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { SlideLayout, WebViewMessages } from '../../constants';
import { Markdown } from './Markdown';
import { EventData } from '@estruyf/vscode';
import { useScale } from '../hooks/useScale';
import { useFileContents } from '../hooks/useFileContents';

export interface IMarkdownPreviewProps {
  fileUri: string;
  webviewUrl: string | null;
}

export const MarkdownPreview: React.FunctionComponent<IMarkdownPreviewProps> = ({
  fileUri,
  webviewUrl
}: React.PropsWithChildren<IMarkdownPreviewProps>) => {
  const { content, crntFilePath, getFileContents } = useFileContents();
  const [theme, setTheme] = React.useState<any | undefined>(undefined);
  const [template, setTemplate] = React.useState<string | undefined>(undefined);
  const [slideType, setSlideType] = React.useState<string | undefined>(undefined);
  const [bgStyles, setBgStyles] = React.useState<any | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const slideRef = React.useRef<HTMLDivElement>(null);
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

  const slideClasses = React.useMemo(() => {
    if (!slideType) {
      return '';
    }

    if (slideType === SlideLayout.ImageLeft || slideType === SlideLayout.ImageRight) {
      return 'grid grid-cols-2 w-full h-full auto-rows-fr';
    }
  }, [slideType]);

  const getBgStyles = React.useCallback(() => {
    if (!slideType || slideType === SlideLayout.ImageLeft || slideType === SlideLayout.ImageRight) {
      return undefined;
    }

    return bgStyles;
  }, [bgStyles, slideType]);

  React.useEffect(() => {
    getFileContents(fileUri);
  }, [fileUri]);

  React.useEffect(() => {
    Messenger.listen(messageListener);

    messageHandler.request<any>(WebViewMessages.toVscode.getTheme).then((theme) => {
      setTheme(theme);
    });

    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  return (
    <div
      key={crntFilePath}
      ref={ref}
      className={`slide fade-in ${template || "default"} relative w-full h-full overflow-hidden`}>
      <div
        className='slide__container absolute top-[50%] left-[50%] w-[960px] h-[540px]'
        style={{ transform: 'translate(-50%, -50%) scale(var(--demotime-scale, 1))' }}>
        <div
          ref={slideRef}
          className={`slide__layout ${slideClasses || ""} ${slideType || "default"}`}
          style={getBgStyles()}>
          {
            slideType === SlideLayout.ImageLeft && (
              <div className={`slide__image_left w-full h-full`} style={bgStyles}></div>
            )
          }

          {
            content && theme ? (
              <div className='slide__content'>
                <Markdown
                  content={content}
                  theme={theme}
                  webviewUrl={webviewUrl}
                  updateTemplate={setTemplate}
                  updateSlideType={setSlideType}
                  updateBgStyles={setBgStyles}
                />
              </div>
            ) : null
          }

          {
            slideType === SlideLayout.ImageRight && (
              <div className={`slide__image_right w-full h-full`} style={bgStyles}></div>
            )
          }
        </div>
      </div>
    </div>
  );
};