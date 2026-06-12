import { useState, useCallback, useEffect } from 'react';
import { Messenger } from '@estruyf/vscode/dist/client';
import { EventData } from '@estruyf/vscode';
import { WebViewMessages } from '@demotime/common';

export const useFileContents = () => {
  const [content, setContent] = useState<string | undefined>(undefined);
  const [crntFilePath, setCrntFilePath] = useState<string | undefined>(undefined);
  const [initialSlideIndex, setInitialSlideIndex] = useState<number | undefined>(0);

  const getFileContents = useCallback(async (fileUri: string) => {
    if (!fileUri) {
      setCrntFilePath(undefined);
      return;
    }

    setCrntFilePath(fileUri);

    fetch(fileUri)
      .then((response) => response.text())
      .then((text) => {
        setContent(text);
      });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messageListener = (message: MessageEvent<EventData<any>>) => {
      const { command, payload } = message.data;
      if (!command) {
        return;
      }

      if (command === WebViewMessages.toWebview.triggerUpdate) {
        if (payload && typeof payload.fileUriString === 'string' && typeof payload.slideIndex === 'number') {
          setInitialSlideIndex(payload.slideIndex);
          getFileContents(payload.fileUriString);
        }
      }
    };

    Messenger.listen(messageListener);

    return () => {
      Messenger.unlisten(messageListener);
    };
  }, [getFileContents]);

  return { content, crntFilePath, initialSlideIndex, getFileContents };
};
