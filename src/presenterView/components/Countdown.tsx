import { Messenger } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { WebViewMessages } from '../../constants';
import { EventData } from '@estruyf/vscode';

export interface ICountdownProps {
  isStarted: Date | undefined;
}

export const Countdown: React.FunctionComponent<ICountdownProps> = ({
  isStarted
}: React.PropsWithChildren<ICountdownProps>) => {
  const [countdown, setCountdown] = React.useState("");

  const messageListener = (message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateCountdown) {
      setCountdown(payload);
    }
  };

  const isNegative = countdown && countdown.startsWith('-');

  React.useEffect(() => {
    Messenger.listen(messageListener);

    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  if (!countdown || !isStarted) {
    return null;
  }

  return (
    <div className="rounded-[2px] border border-[var(--vscode-panel-border)] shadow-sm">
      <div className="flex flex-col space-y-1.5 p-4">
        <h3 className="text-xl font-semibold leading-none tracking-tight">Countdown</h3>
      </div>
      <div className="p-4 pt-0">
        <p className={`text-2xl font-bold ${isNegative ? 'text-[var(--vscode-notificationsErrorIcon-foreground)]' : ''}`}>{countdown}</p>
      </div>
    </div>
  );
};