import { EventData } from '@estruyf/vscode';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { COMMAND, WebViewMessages } from '@demotime/common';
import { ImagePreview, MarkdownPreview } from '../preview';

import '../../styles/preview.css';
import '../../themes/default.css';
import '../../themes/minimal.css';
import '../../themes/unnamed.css';
import '../../themes/monomi.css';
import '../../themes/quantum.css';
import '../../themes/frost.css';
import '../../webcomponents';
import { useWebviewSettings } from '../../providers';

const PreviewView = () => {
  const { webviewUrl } = useWebviewSettings();
  const [customTheme, setCustomTheme] = React.useState<string | undefined>(undefined);
  const [fileUri, setFileUri] = React.useState<string | undefined>(undefined);
  const [slideIdx, setSlideIdx] = React.useState<number | undefined>(undefined);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      messageHandler.send(WebViewMessages.toVscode.runCommand, COMMAND.closePresentationView);
    }
  };

  const messageListener = React.useCallback((message: MessageEvent<EventData<unknown>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateStyles) {
      setCustomTheme(payload as string);
    } else if (command === WebViewMessages.toWebview.updateFileUri) {
      setFileUri(payload as string);
    } else if (command === WebViewMessages.toWebview.triggerUpdate) {
      type UpdatePayload = { fileUriString: string; slideIndex: number };
      const updatePayload = payload as UpdatePayload;
      if (
        updatePayload &&
        typeof updatePayload.fileUriString === 'string' &&
        typeof updatePayload.slideIndex === 'number'
      ) {
        if (updatePayload.slideIndex === 0) {
          // Reset slide index to force update
          setSlideIdx(-1);
          setTimeout(() => setSlideIdx(updatePayload.slideIndex), 0);
        } else {
          setSlideIdx(updatePayload.slideIndex);
        }
        setFileUri(updatePayload.fileUriString);
      }
    }
  }, []);

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
  }, [messageListener]);

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

export default PreviewView;
