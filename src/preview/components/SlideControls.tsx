import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { Icon } from 'vscrui';
import { COMMAND, WebViewMessages } from '../../constants';

export interface ISlideControlsProps {
  show: boolean;
}

export const SlideControls: React.FunctionComponent<ISlideControlsProps> = ({
  show
}: React.PropsWithChildren<ISlideControlsProps>) => {
  const [previousEnabled, setPreviousEnabled] = React.useState(false);

  const previous = React.useCallback(() => {
    if (previousEnabled) {
      messageHandler.send(WebViewMessages.toVscode.runCommand, COMMAND.previous);
    }
  }, [previousEnabled]);

  const next = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, COMMAND.start);
  }, []);

  React.useEffect(() => {
    if (show) {
      messageHandler.request<boolean>(WebViewMessages.toVscode.getPreviousEnabled).then((previous) => {
        setPreviousEnabled(previous);
      });
    }
  }, [show]);

  return (
    <div
      className={`absolute bottom-4 left-1/2 -translate-x-1/2 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
    >
      <div
        className="bg-[var(--vscode-editorWidget-background)] rounded-lg p-2 flex items-center gap-4"
        style={{ boxShadow: '0 0 8px 2px var(--vscode-widget-shadow)' }}>
        {
          previousEnabled && (
            <button
              onClick={previous}
              className="p-2 inline-flex justify-center items-center rounded hover:bg-[var(--vscode-toolbar-hoverBackground)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name='chevron-left' className="!text-[var(--vscode-editorWidget-foreground)] inline-flex justify-center items-center" />
            </button>
          )
        }

        <button
          onClick={next}
          className="p-2 inline-flex justify-center items-center rounded hover:bg-[var(--vscode-toolbar-hoverBackground)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name='chevron-right' className="!text-[var(--vscode-editorWidget-foreground)] inline-flex justify-center items-center" />
        </button>
      </div>
    </div>
  );
};