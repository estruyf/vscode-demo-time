import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { WebViewMessages } from '@demotime/common';

export interface IEmbedPreviewProps {
  url: string;
  title: string;
}

export const EmbedPreview: React.FunctionComponent<IEmbedPreviewProps> = ({
  url,
  title,
}: React.PropsWithChildren<IEmbedPreviewProps>) => {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    messageHandler.send(WebViewMessages.toVscode.updateTitle, title);
    messageHandler.send(WebViewMessages.toVscode.slideReady);
  }, [url, title]);

  React.useEffect(() => {
    // Keydown events inside the cross-origin iframe never reach the webview, so the next and
    // previous keybindings (and clickers) would stop working. Take the focus back from the iframe.
    const releaseFocus = () => {
      setTimeout(() => {
        if (iframeRef.current && document.activeElement === iframeRef.current) {
          iframeRef.current.blur();
          window.focus();
        }
      }, 0);
    };

    window.addEventListener('blur', releaseFocus);
    return () => window.removeEventListener('blur', releaseFocus);
  }, []);

  return (
    <div className="preview_view h-full w-full relative">
      <iframe
        ref={iframeRef}
        src={url}
        title={title}
        tabIndex={-1}
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
};
