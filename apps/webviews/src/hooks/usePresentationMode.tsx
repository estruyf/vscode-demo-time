import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { EventData } from '@estruyf/vscode';
import { WebViewMessages } from '@demotime/common';

/**
 * Tracks whether presentation mode is on.
 *
 * @returns `undefined` until the extension answered, then whether presentation mode is on.
 */
export const usePresentationMode = () => {
  const [isPresentationMode, setIsPresentationMode] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    messageHandler
      .request<boolean>(WebViewMessages.toVscode.getPresentationStarted)
      .then((value) => setIsPresentationMode(!!value))
      .catch(() => setIsPresentationMode(false));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messageListener = (message: MessageEvent<EventData<any>>) => {
      const { command, payload } = message.data;
      if (command === WebViewMessages.toWebview.updateIsInPresentationMode) {
        setIsPresentationMode(!!payload);
      }
    };

    Messenger.listen(messageListener);
    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  return isPresentationMode;
};
