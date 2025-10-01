import { COMMAND } from '@demotime/common';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { Button, Icon } from 'vscrui';
import { WebViewMessages } from '@demotime/common';

export const ResetAction = () => {
  const reset = () => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, { command: COMMAND.reset });
  };

  return (
    <div>
      <Button
        appearance={`secondary`}
        onClick={reset}
        title={`Reset the presentation`}
        className='bg-transparent! hover:bg-(--vscode-button-secondaryHoverBackground)!'>
        <Icon name='refresh' className="w-4 h-4 text-(--vscode-button-secondaryForeground)! hover:text-(--vscode-button-secondaryHoverForeground)!" />

        <span className='sr-only'>Reset the presentation</span>
      </Button>
    </div>
  );
};