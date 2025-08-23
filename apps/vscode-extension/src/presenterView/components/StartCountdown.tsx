import * as React from 'react';
import { COMMAND } from '../../constants';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { Button } from 'vscrui';
import { TimerOffIcon } from '../icons/TimerOffIcon';
import { TimerIcon } from '../icons/TimerIcon';
import { WebViewMessages } from '@demotime/common';

export interface IStartCountdownProps {
  isStarted: Date | undefined;
}

export const StartCountdown: React.FunctionComponent<IStartCountdownProps> = ({
  isStarted
}: React.PropsWithChildren<IStartCountdownProps>) => {
  const stopCountdown = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, { command: isStarted ? COMMAND.resetCountdown : COMMAND.startCountdown });
  }, [isStarted]);

  const title = React.useMemo(() => {
    return isStarted ? "Stop countdown" : "Start countdown";
  }, [isStarted]);

  return (
    <Button
      appearance={`secondary`}
      onClick={stopCountdown}
      title={title}
      className='bg-transparent! hover:bg-(--vscode-button-secondaryHoverBackground)!'>
      {
        isStarted ? (
          <TimerOffIcon className="w-4 h-4" />
        ) : (
          <TimerIcon className="w-4 h-4" />
        )
      }

      <span className='sr-only'>{title}</span>
    </Button>
  );
};