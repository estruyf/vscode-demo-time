import { Messenger } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { WebViewMessages } from '../../constants';
import { EventData } from '@estruyf/vscode';

export interface IClockProps {}

export const Clock: React.FunctionComponent<IClockProps> = (props: React.PropsWithChildren<IClockProps>) => {
  const [clock, setClock] = React.useState("");

  const messageListener = (message: MessageEvent<EventData<any>>) => {
      const { command, payload } = message.data;
      if (!command) {
        return;
      }
  
      if (command === WebViewMessages.toWebview.updateClock) {
        setClock(payload);
      }
    };

  React.useEffect(() => {
    Messenger.listen(messageListener);

    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  if (!clock) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[var(--vscode-panel-border)] shadow-sm">
      <div className="flex flex-col space-y-1.5 p-4">
        <h3 className="text-xl font-semibold leading-none tracking-tight">Current Time</h3>
      </div>
      <div className="p-4 pt-0">
        <p className="text-2xl font-bold">{clock}</p>
      </div>
    </div>
  );
};