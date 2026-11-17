import { useEffect, useState } from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { EventData } from '@estruyf/vscode';
import { getCodeFileBlocks, WebViewMessages } from '@demotime/common';

const hasCodeFiles = (content?: string) =>
  !!content && content.includes('file=') && getCodeFileBlocks(content).length > 0;

/**
 * Replaces the code blocks with a `file` option, like ` ```ts file="src/app.ts#L10-24" `, by the
 * code of that file. The extension reads the files, and the content updates when they change.
 *
 * @returns The slide content with the code, `undefined` while the files load
 */
export const useCodeFiles = (content?: string) => {
  const [resolved, setResolved] = useState<{ source?: string; value?: string }>({});
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messageListener = (message: MessageEvent<EventData<any>>) => {
      if (message.data?.command === WebViewMessages.toWebview.preview.codeFilesChanged) {
        setVersion((crntVersion) => crntVersion + 1);
      }
    };

    Messenger.listen(messageListener);
    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  const withCodeFiles = hasCodeFiles(content);

  useEffect(() => {
    if (!withCodeFiles || !content) {
      return;
    }

    let cancelled = false;
    messageHandler
      .request<string>(WebViewMessages.toVscode.preview.resolveCodeFiles, content)
      .then((value) => {
        if (!cancelled) {
          setResolved({ source: content, value: typeof value === 'string' ? value : content });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolved({ source: content, value: content });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [content, withCodeFiles, version]);

  if (!withCodeFiles) {
    return content;
  }

  // Keep showing the previous code while a changed file loads again
  return resolved.source === content ? resolved.value : undefined;
};
