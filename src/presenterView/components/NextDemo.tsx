import { EventData } from '@estruyf/vscode';
import * as React from 'react';
import { COMMAND, WebViewMessages } from '../../constants';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { Demo } from '../../models';
import { Button } from 'vscrui';

export interface INextDemoProps {}

export const NextDemo: React.FunctionComponent<INextDemoProps> = (props: React.PropsWithChildren<INextDemoProps>) => {
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
    messageHandler.send(WebViewMessages.toVscode.runCommand, COMMAND.start);
  };

  React.useEffect(() => {
    Messenger.listen(messageListener);

    messageHandler.request<Demo | undefined>(WebViewMessages.toVscode.getNextDemo).then((files: Demo | undefined) => {
      setNextDemo(files);
    });
    
    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  if (!nextDemo || !nextDemo.title) {
    return null;
  }

  return (
    <div className="flex justify-end">
      <Button onClick={runNextDemo}>
        {nextDemo.title}
      </Button>
    </div>
  );
};