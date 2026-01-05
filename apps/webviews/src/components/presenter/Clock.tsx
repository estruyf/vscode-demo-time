import { Messenger } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { WebViewMessages } from '@demotime/common';
import { EventData } from '@estruyf/vscode';
import { Icon } from 'vscrui';

export const Clock = () => {
  const [clock, setClock] = React.useState("");

  const messageListener = (message: MessageEvent<EventData<unknown>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateClock) {
      setClock(payload as string);
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
    <div className="presenter-card rounded-lg border border-(--vscode-panel-border) bg-(--vscode-sideBar-background) shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="presenter-card-header flex items-center gap-3 px-5 py-4 border-b border-(--vscode-panel-border)/50">
        <div className="flex-shrink-0 w-5 h-5 text-(--vscode-descriptionForeground)">
          <Icon name="clock" className="text-inherit!" />
        </div>
        <h3 className="text-base font-semibold leading-none tracking-tight text-(--vscode-foreground)">
          Current Time
        </h3>
      </div>
      <div className="presenter-card-body px-5 py-6 flex items-center justify-center">
        <p className="text-4xl font-bold tracking-tight text-(--vscode-foreground) tabular-nums">
          {clock}
        </p>
      </div>
    </div>
  );
};