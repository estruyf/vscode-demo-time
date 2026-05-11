import { EventData } from '@estruyf/vscode';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { COMMAND, WebViewMessages } from '@demotime/common';
import { ImagePreview, MarkdownPreview, QRPreview } from '../preview';

import '../../styles/preview.css';
import '../../themes/default.css';
import '../../themes/minimal.css';
import '../../themes/unnamed.css';
import '../../themes/monomi.css';
import '../../themes/quantum.css';
import '../../themes/frost.css';
import '../../themes/pixels.css';
import '../../webcomponents';
import { useWebviewSettings } from '../../providers';

const PreviewView = () => {
  const { webviewUrl } = useWebviewSettings();
  const [customTheme, setCustomTheme] = React.useState<string | undefined>(undefined);
  const [fileUri, setFileUri] = React.useState<string | undefined>(undefined);
  const [slideIdx, setSlideIdx] = React.useState<number | undefined>(undefined);
  const [qrData, setQrData] = React.useState<{
    url: string;
    topText?: string;
    title?: string;
    description?: string;
    logo?: string;
  } | null>(null);

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
    } else if (command === WebViewMessages.toWebview.showQR) {
      const qrPayload = payload as {
        url: string;
        topText?: string;
        title?: string;
        description?: string;
        logo?: string;
      };
      if (qrPayload?.url) {
        // Replace current preview with QR preview
        setQrData(qrPayload);
        setFileUri(undefined);
        setSlideIdx(undefined);
        messageHandler.send(WebViewMessages.toVscode.updateTitle, 'QR Code');
      }
    } else if (command === WebViewMessages.toWebview.updateFileUri) {
      setFileUri(payload as string);
    } else if (command === WebViewMessages.toWebview.triggerUpdate) {
      setQrData(null); // Clear QR data on update trigger to allow switching back to file previews
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
          setSlideIdx(-1);
          setTimeout(() => setSlideIdx(updatePayload.slideIndex), 0);
        }
        setFileUri(updatePayload.fileUriString);
      }
    }
  }, []);

  const type = React.useMemo(() => {
    // QR preview takes priority
    if (qrData) {
      return 'qr';
    }

    if (!fileUri) {
      return null;
    }

    const fileExtension = fileUri.split('.').pop();
    if (fileExtension === 'md') {
      messageHandler.send(WebViewMessages.toVscode.updateTitle, 'Slide');
      return 'markdown';
    }

    if (fileUri.startsWith('http')) {
      messageHandler.send(WebViewMessages.toVscode.updateTitle, 'QR');
      const url = new URL(fileUri);
      const topText = url.searchParams.get('qrTopText') || undefined;
      const title = url.searchParams.get('qrTitle') || url.searchParams.get('qrLabel') || undefined;
      const description = url.searchParams.get('qrDescription') || undefined;
      const logo = url.searchParams.get('qrLogo') || undefined;
      url.searchParams.delete('qrTopText');
      url.searchParams.delete('qrTitle');
      url.searchParams.delete('qrDescription');
      url.searchParams.delete('qrLabel');
      url.searchParams.delete('qrLogo');
      setQrData({ url: url.href, topText, title, description, logo });
      return 'qr';
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
  }, [fileUri, qrData]);

  React.useEffect(() => {
    Messenger.listen(messageListener);
    window.addEventListener('keydown', handleKeyDown);

    messageHandler.request<string>(WebViewMessages.toVscode.getStyles).then((styles) => {
      setCustomTheme(styles);

      messageHandler.request<{
        path: string,
        slideIndex: number,
      }>(WebViewMessages.toVscode.preview.getSlide).then((data) => {
        setFileUri(data.path);
        setSlideIdx(data.slideIndex);
      });
    });

    return () => {
      Messenger.unlisten(messageListener);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [messageListener]);

  if (!qrData && (!fileUri || typeof slideIdx === 'undefined')) {
    return null;
  }

  return (
    <>
      {customTheme && <link href={customTheme} rel="stylesheet" />}

      {type === 'qr' && qrData && (
        <QRPreview
          url={qrData.url}
          topText={qrData.topText}
          title={qrData.title}
          description={qrData.description}
          logo={qrData.logo}
        />
      )}
      {type === 'markdown' && fileUri && typeof slideIdx !== 'undefined' && <MarkdownPreview fileUri={fileUri} slideIdx={slideIdx} webviewUrl={webviewUrl} />}
      {type === 'image' && fileUri && <ImagePreview fileUri={fileUri} />}
    </>
  );
};

export default PreviewView;
