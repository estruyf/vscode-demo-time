import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { COMMAND, WebViewMessages } from '../../constants';
import { EventData } from '@estruyf/vscode';
import { Button } from 'vscrui';

export interface ICountdownProps {
  time: number | undefined;
}

export const Countdown: React.FunctionComponent<ICountdownProps> = ({
  time
}: React.PropsWithChildren<ICountdownProps>) => {
  const [countdown, setCountdown] = React.useState("");
  const [isPaused, setIsPaused] = React.useState<boolean | undefined>(undefined);

  const messageListener = (message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateCountdown) {
      setCountdown(payload);
    } else if (command === WebViewMessages.toWebview.resetCountdown) {
      setCountdown("");
    } else if (command === WebViewMessages.toWebview.updateCountdownStatus) {
      setIsPaused(payload);
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
    <div className="rounded-[2px] border border-(--vscode-panel-border) shadow-xs">
      <div className="flex flex-col space-y-1.5 p-4">
        <h3 className="text-xl font-semibold leading-none tracking-tight">Countdown</h3>
      </div>
      <div className="p-4 pt-0">
        <p className={`text-2xl font-bold ${isNegative ? 'text-(--vscode-notificationsErrorIcon-foreground)' : ''}`}>
          {countdown ?? (time ? `${time} min` : '0s')}
        </p>
      </div>
      <div className="flex space-x-2 p-4 pt-0">
        {
          (!countdown || isPaused) && (
            <Button
              onClick={countdown ? pauseCountdown : startCountdown}
            >
              {countdown ? "Resume" : "Start"}
            </Button>
          )
        }

        {(!isPaused && countdown) && (
          <Button
            onClick={pauseCountdown}
          >
            Pause
          </Button>
        )}

        <Button
          onClick={resetCountdown}
        >
          Reset
        </Button>
      </div>
    </div>
  );
};