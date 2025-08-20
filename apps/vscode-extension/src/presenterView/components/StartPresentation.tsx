import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { Button, Icon } from 'vscrui';
import { COMMAND, WebViewMessages } from '../../constants';
import { EventData } from '@estruyf/vscode';
import { ProjectorIcon } from '../icons/ProjectorIcon';

export interface IStartPresentationProps {}

export const StartPresentation: React.FunctionComponent<IStartPresentationProps> = (props: React.PropsWithChildren<IStartPresentationProps>) => {
  const [isStarted, setIsStarted] = React.useState<boolean | undefined>(undefined);
  
  const messageListener = (message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updatePresentationStarted) {
      setIsStarted(payload);
    }
  };

  const startPresentationMode = () => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, { command: COMMAND.togglePresentationMode });
  };

  const title = React.useMemo(() => {
    return isStarted ? "Stop presentation mode" : "Start presentation mode";
  }, [isStarted]);

  React.useEffect(() => {
    Messenger.listen(messageListener);

    messageHandler.request<boolean | undefined>(WebViewMessages.toVscode.getPresentationStarted).then((started: boolean | undefined) => {
      setIsStarted(started);
    });
    
    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  return (
    <div>
      <Button
        appearance={`secondary`}
        onClick={startPresentationMode}
        title={title}
        className='!bg-transparent hover:!bg-[var(--vscode-button-secondaryHoverBackground)]'>
        {
          isStarted ? (
            <Icon name='debug-stop' className="w-4 h-4 !text-[var(--vscode-button-secondaryForeground)] hover:!text-[var(--vscode-button-secondaryHoverForeground)]" />
          ) : (
            <ProjectorIcon className="w-4 h-4" />
          )
        }
        
        <span className='sr-only'>{title}</span>
      </Button>
    </div>
  );
};