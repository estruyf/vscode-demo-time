import * as React from 'react';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { WebViewMessages } from '../../constants';
import { Markdown } from './Markdown';

export interface IMarkdownPreviewProps {
  fileUri: string;
  webviewUrl: string | null;
}

export const MarkdownPreview: React.FunctionComponent<IMarkdownPreviewProps> = ({
  fileUri,
  webviewUrl
}: React.PropsWithChildren<IMarkdownPreviewProps>) => {
  const [content, setContent] = React.useState<string | undefined>(undefined);
  const [theme, setTheme] = React.useState<any | undefined>(undefined);

  React.useEffect(() => {
    if (!fileUri) {
      return;
    }

    fetch(fileUri)
      .then((response) => response.text())
      .then((text) => {
        setContent(text);
      });
  }, [fileUri]);

  React.useEffect(() => {
    messageHandler.request<any>(WebViewMessages.toVscode.getTheme).then((theme) => {
      setTheme(theme);
    });
  }, []);

  if (!content || !theme) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-7 py-4 space-y-4">
      <Markdown content={content} theme={theme} webviewUrl={webviewUrl} />
    </div>
  );
};