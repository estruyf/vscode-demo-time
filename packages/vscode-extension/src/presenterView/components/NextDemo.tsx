import { EventData } from '@estruyf/vscode';
import * as React from 'react';
import { COMMAND, WebViewMessages } from '../../constants';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { Demo } from '../../models';
import { Button, Icon } from 'vscrui';

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
  const [nextDemo, setNextDemo] = React.useState<Demo | undefined>(undefined);

  const messageListener = (message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateNextDemo) {
      setNextDemo(payload);
    }
  };

  const runNextDemo = () => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, { command: COMMAND.start});
  };

  React.useEffect(() => {
    Messenger.listen(messageListener);

    messageHandler.request<Demo | undefined>(WebViewMessages.toVscode.getNextDemo).then((demo) => {
      setNextDemo(demo);
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
      <span className={titleClass}>{nextDemo?.title || "Start"}</span>

      <Icon name="arrow-right" className={`!text-inherit ${iconClass}`} />
    </Button>
  );
};