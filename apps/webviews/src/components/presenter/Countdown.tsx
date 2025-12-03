import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { COMMAND } from '@demotime/common';
import { EventData } from '@estruyf/vscode';
import { Button, Icon } from 'vscrui';
import { WebViewMessages } from '@demotime/common';

export interface ICountdownProps {
  time: number | undefined;
}

export const Countdown: React.FunctionComponent<ICountdownProps> = ({
  time
}: React.PropsWithChildren<ICountdownProps>) => {
  const [countdown, setCountdown] = React.useState("");
  const [isPaused, setIsPaused] = React.useState<boolean | undefined>(undefined);

  const messageListener = (message: MessageEvent<EventData<unknown>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateCountdown) {
      setCountdown(payload as string);
    } else if (command === WebViewMessages.toWebview.resetCountdown) {
      setCountdown("");
    } else if (command === WebViewMessages.toWebview.updateCountdownStatus) {
      setIsPaused(payload as boolean | undefined);
    }
  };

  const resetCountdown = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, { command: COMMAND.resetCountdown });
  }, []);

  const pauseCountdown = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, { command: COMMAND.pauseCountdown });
  }, []);

  const startCountdown = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, { command: COMMAND.startCountdown });
  }, []);

  const isNegative = countdown && countdown.startsWith('-');

  React.useEffect(() => {
    Messenger.listen(messageListener);

    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  if (!time) {
    return null;
  }

  return (
    <div className="presenter-card rounded-lg border border-(--vscode-panel-border) bg-(--vscode-sideBar-background) shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="presenter-card-header flex items-center gap-3 px-5 py-4 border-b border-(--vscode-panel-border)/50">
        <div className="flex-shrink-0 w-5 h-5 text-(--vscode-descriptionForeground)">
          <Icon name="watch" className="text-inherit!" />
        </div>
        <h3 className="text-base font-semibold leading-none tracking-tight text-(--vscode-foreground)">
          Countdown Timer
        </h3>
      </div>
      <div className="presenter-card-body px-5 py-6 flex items-center justify-center">
        <p className={`text-4xl font-bold tracking-tight tabular-nums transition-colors duration-200 ${isNegative ? 'text-(--vscode-notificationsErrorIcon-foreground)' : 'text-(--vscode-foreground)'}`}>
          {countdown || (time ? `${time} min` : '0s')}
        </p>
      </div>
      <div className="presenter-card-footer flex items-center justify-center gap-3 px-5 py-4 bg-(--vscode-editor-background)/50 border-t border-(--vscode-panel-border)/50">
        {(!countdown || isPaused) && (
          <Button onClick={countdown ? pauseCountdown : startCountdown}>
            <Icon name={countdown ? 'debug-continue' : 'play'} className="text-inherit! mr-1" />
            {countdown ? "Resume" : "Start"}
          </Button>
        )}

        {(!isPaused && countdown) && (
          <Button onClick={pauseCountdown}>
            <Icon name='debug-pause' className="text-inherit! mr-1" />
            Pause
          </Button>
        )}

        <Button appearance='secondary' onClick={resetCountdown}>
          <Icon name='refresh' className="text-inherit! mr-1" />
          Reset
        </Button>
      </div>
    </div>
  );
};