import { EventData } from '@estruyf/vscode';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { WebViewMessages } from '../../constants';
import { MarkdownPreview } from './MarkdownPreview';
import { ImagePreview } from './ImagePreview';

export interface IAppProps {
  webviewUrl: string | null;
}

export const App: React.FunctionComponent<IAppProps> = ({
  webviewUrl
}: React.PropsWithChildren<IAppProps>) => {
  const [customStyles, setCustomStyles] = React.useState<string | undefined>(undefined);
  const [fileUri, setFileUri] = React.useState<string | undefined>(undefined);

  const messageListener = (message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateStyles) {
      setCustomStyles(payload);
    } else if (command === WebViewMessages.toWebview.updateFileUri) {
      setFileUri(payload);
    }
  };

  const type = React.useMemo(() => {
    if (!fileUri) {
      return null;
    }

    const fileExtension = fileUri.split('.').pop();
    if (fileExtension === 'md') {
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
      return 'image';
    }

    return null;
  }, [fileUri]);

  React.useEffect(() => {
    Messenger.listen(messageListener);

    messageHandler.request<string>(WebViewMessages.toVscode.getStyles).then((styles) => {
      setCustomStyles(styles);

      messageHandler.request<string>(WebViewMessages.toVscode.getFileUri).then((fileUri) => {
        setFileUri(fileUri);
      });
    });

    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  if (!fileUri) {
    return null;
  }

  return (
    <>
      {customStyles && <style>{customStyles}</style>}

      {type === 'markdown' && <MarkdownPreview fileUri={fileUri} webviewUrl={webviewUrl} />}
      {type === 'image' && <ImagePreview fileUri={fileUri} />}
    </>
  );
};