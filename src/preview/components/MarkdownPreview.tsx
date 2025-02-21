import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { WebViewMessages } from '../../constants';
import { Markdown } from './Markdown';
import { EventData } from '@estruyf/vscode';

export interface IMarkdownPreviewProps {
  fileUri: string;
  webviewUrl: string | null;
}

const Slide_Width = 960;
const Slide_Height = 540;

export const MarkdownPreview: React.FunctionComponent<IMarkdownPreviewProps> = ({
  fileUri,
  webviewUrl
}: React.PropsWithChildren<IMarkdownPreviewProps>) => {
  const [content, setContent] = React.useState<string | undefined>(undefined);
  const [theme, setTheme] = React.useState<any | undefined>(undefined);
  const ref = React.useRef<HTMLDivElement>(null);
  const slideRef = React.useRef<HTMLDivElement>(null);
  const [template, setTemplate] = React.useState<string | undefined>(undefined);
  const [slideType, setSlideType] = React.useState<string | undefined>(undefined);

  const getFileContents = React.useCallback(async (fileUri: string) => {
    if (!fileUri) {
      return;
    }

    fetch(fileUri)
      .then((response) => response.text())
      .then((text) => {
        setContent(text);
      });
  }, []);

  const messageListener = (message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.triggerUpdate) {
      getFileContents(payload);
    }
  };

  const updateScale = React.useCallback(() => {
    if (!slideRef.current || !ref.current) {
      return;
    }

    const { width, height } = ref.current.getBoundingClientRect();
    const scale = Math.min(width / Slide_Width, height / Slide_Height);
    const scaledWidth = Slide_Width * scale;
    const scaledHeight = Slide_Height * scale;

    if (scale > 2.5) {
      document.documentElement.style.setProperty('--demotime-scale', '2.5');
    } else if (scaledWidth <= width && scaledHeight <= height) {
      document.documentElement.style.setProperty('--demotime-scale', scale.toString());
    } else if (scaledWidth <= width) {
      document.documentElement.style.setProperty('--demotime-scale', (width / Slide_Width).toString());
    } else if (scaledHeight <= height) {
      document.documentElement.style.setProperty('--demotime-scale', (height / Slide_Height).toString());
    } else {
      document.documentElement.style.setProperty('--demotime-scale', '1');
    }
  }, [slideRef.current, ref.current]);

  React.useEffect(() => {
    getFileContents(fileUri);
  }, [fileUri]);

  React.useEffect(() => {
    const handleResize = () => {
      updateScale();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updateScale]);

  React.useEffect(() => {
    if (!slideRef.current) {
      return;
    }

    const observer = new MutationObserver(() => {
      updateScale();
    });

    observer.observe(slideRef.current, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [slideRef.current, ref.current]);

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
    <div ref={ref} className={`slideshow ${template || "default"} ${slideType || "default"} relative w-full h-full overflow-hidden`}>
      <div className='absolute top-[50%] left-[50%] w-[960px] h-[540px]' style={{ transform: 'translate(-50%, -50%) scale(var(--demotime-scale, 1))' }}>
        <div ref={slideRef} className={`slide`}>
          {
            content && theme ? (
              <Markdown
                content={content}
                theme={theme}
                webviewUrl={webviewUrl}
                updateTemplate={setTemplate}
                updateSlideType={setSlideType}
              />
            ) : null
          }
        </div>
      </div>
    </div>
  );
};