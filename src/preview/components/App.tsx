import { EventData } from '@estruyf/vscode';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { COMMAND, WebViewMessages } from '../../constants';
import { MarkdownPreview } from './MarkdownPreview';
import { ImagePreview } from './ImagePreview';

export interface IAppProps {
  webviewUrl: string | null;
}

export const App: React.FunctionComponent<IAppProps> = ({
  webviewUrl
}: React.PropsWithChildren<IAppProps>) => {
  const [customTheme, setCustomTheme] = React.useState<string | undefined>(undefined);
  const [fileUri, setFileUri] = React.useState<string | undefined>(undefined);
  const [slideIdx, setSlideIdx] = React.useState<number | undefined>(undefined);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      messageHandler.send(WebViewMessages.toVscode.runCommand, COMMAND.closePresentationView);
    }
  };

  const messageListener = React.useCallback((message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateStyles) {
      setCustomTheme(payload);
    } else if (command === WebViewMessages.toWebview.updateFileUri) {
      setFileUri(payload);
    } else if (command === WebViewMessages.toWebview.triggerUpdate) {
      if (payload && typeof payload.fileUriString === 'string') {
        if (payload.slideIndex === 0) {
          // Reset slide index to force update
          setSlideIdx(-1);
          setTimeout(() => setSlideIdx(payload.slideIndex), 0);
        } else {
          setSlideIdx(payload.slideIndex);
        }
        setFileUri(payload.fileUriString);
      }
    }
  }, [fileUri, slideIdx]);

  const type = React.useMemo(() => {
    if (!fileUri) {
      return null;
    }

    const fileExtension = fileUri.split('.').pop();
    if (fileExtension === 'md') {
      messageHandler.send(WebViewMessages.toVscode.updateTitle, 'Slide');
      return 'markdown';
    }

    if (fileExtension === 'png' ||
      fileExtension === 'jpg' ||
      fileExtension === 'jpeg' ||
      fileExtension === 'gif' ||
      fileExtension === 'svg' ||
      fileExtension === 'webp' ||
      fileExtension === 'avif'
    ) {
      messageHandler.send(WebViewMessages.toVscode.updateTitle, 'Image');
      return 'image';
    }

    return null;
  }, [fileUri]);

  React.useEffect(() => {
    Messenger.listen(messageListener);
    window.addEventListener('keydown', handleKeyDown);

    messageHandler.request<string>(WebViewMessages.toVscode.getStyles).then((styles) => {
      setCustomTheme(styles);

      messageHandler.request<string>(WebViewMessages.toVscode.getFileUri).then((fileUri) => {
        setFileUri(fileUri);
      });
    });

    return () => {
      Messenger.unlisten(messageListener);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!fileUri) {
    return null;
  }

  return (
    <>
      {customTheme && <link href={customTheme} rel="stylesheet" />}

      {type === 'markdown' && <MarkdownPreview fileUri={fileUri} slideIdx={slideIdx} webviewUrl={webviewUrl} />}
      {type === 'image' && <ImagePreview fileUri={fileUri} />}
    </>
  );
};