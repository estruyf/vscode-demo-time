import { EventData } from '@estruyf/vscode';
import * as React from 'react';
import { COMMAND, Demo } from '@demotime/common';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { Button, Icon } from 'vscrui';
import { WebViewMessages } from '@demotime/common';

export interface INextDemoProps {
  className?: string;
  titleClass?: string;
  iconClass?: string;
  secondary?: boolean;
}

export const NextDemo: React.FunctionComponent<INextDemoProps> = ({
  className,
  titleClass,
  iconClass,
  secondary
}: React.PropsWithChildren<INextDemoProps>) => {
  const [nextDemo, setNextDemo] = React.useState<string | undefined>(undefined);
  const [nextCommand, setNextCommand] = React.useState<string>(COMMAND.start);

  const messageListener = (message: MessageEvent<EventData<unknown>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateNextDemo) {
      setNextDemo((payload as Demo).title);
      setNextCommand(COMMAND.start);
    } else if (command === WebViewMessages.toWebview.preview.updateNextStep) {
      const payloadObj = payload as { title: string; command: string };
      if (!payloadObj.title || !payloadObj.command) {
        return;
      }

      setNextDemo(payloadObj.title);
      setNextCommand(payloadObj.command);
    }
  };

  const runNextDemo = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, { command: nextCommand });
  }, [nextCommand]);

  React.useEffect(() => {
    Messenger.listen(messageListener);

    messageHandler.request<Demo | undefined>(WebViewMessages.toVscode.getNextDemo).then((demo) => {
      setNextDemo(demo?.title);
      setNextCommand(COMMAND.start);
    });

    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  return (
    <Button
      className={className || ""}
      onClick={runNextDemo}
      appearance={secondary ? "secondary" : "primary"}>
      <span className={titleClass}>{nextDemo || "Start"}</span>

      <Icon name="arrow-right" className={`text-inherit! ${iconClass}`} />
    </Button>
  );
};
