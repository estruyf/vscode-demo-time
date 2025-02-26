import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { COMMAND, WebViewMessages } from '../../constants';
import { SlideControl } from './SlideControl';
import { WhiteboardIcon } from './WhiteboardIcon';
import { DemoTimeLogo } from './DemoTimeLogo';
import { Icon } from 'vscrui';

export interface ISlideControlsProps {
  show: boolean;
}

export const SlideControls: React.FunctionComponent<ISlideControlsProps> = ({
  show
}: React.PropsWithChildren<ISlideControlsProps>) => {
  const [previousEnabled, setPreviousEnabled] = React.useState(false);

  const previous = React.useCallback(() => {
    if (previousEnabled) {
      messageHandler.send(WebViewMessages.toVscode.runCommand, COMMAND.previous);
    }
  }, [previousEnabled]);

  const next = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, COMMAND.start);
  }, []);

  const toggleFullscreen = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, "workbench.action.toggleFullScreen");
  }, []);

  const togglePresentationView = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, COMMAND.togglePresentationView);
  }, []);

  const closeSidebar = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, "workbench.action.closeSidebar");
  }, []);

  const focusPanel = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, "demo-time.focus");
  }, []);

  React.useEffect(() => {
    if (show) {
      messageHandler.request<boolean>(WebViewMessages.toVscode.getPreviousEnabled).then((previous) => {
        setPreviousEnabled(previous);
      });
    }
  }, [show]);

  return (
    <div
      className={`absolute bottom-0 w-full transition-opacity duration-300 ${show ? 'opacity-90' : 'opacity-0 pointer-events-none'
        }`}
    >
      <div
        className="bg-[var(--vscode-editorWidget-background)] p-2 grid grid-cols-3 gap-4"
        style={{ boxShadow: '0 0 8px 0 var(--vscode-widget-shadow)' }}
      >
        <div className='flex items-center'>
          <SlideControl title="Toggle fullscreen" iconName="screen-full" action={toggleFullscreen} />
          <SlideControl title="Toggle presentation view" icon={<WhiteboardIcon className="w-4 h-4 text-[var(--vscode-editorWidget-foreground)] inline-flex justify-center items-center" />} action={togglePresentationView} />
          <SlideControl title="Close sidebar" icon={(
            <div className='relative inline-flex justify-center items-center'>
              <div className='absolute -top-[2px] -right-[2px] w-2 h-2 bg-[var(--vscode-editorWidget-foreground)] rounded-full inline-flex justify-center items-center'>
                <Icon name='close' className='!text-[var(--vscode-editorWidget-background)] block' style={{ fontSize: "8px" }} />
              </div>
              <Icon name='layout-sidebar-left' className='!text-[var(--vscode-editorWidget-foreground)] inline-flex justify-center items-center' />
            </div>
          )} action={closeSidebar} />
          <SlideControl title="Show demos" iconName='list-unordered' action={focusPanel} />
        </div>

        <div className="flex items-center justify-center gap-4">
          {
            previousEnabled && (
              <SlideControl title="Previous" iconName="arrow-left" action={previous} isSlideControl />
            )
          }

          <SlideControl title="Next" iconName="arrow-right" action={next} isSlideControl />
        </div>
        <div></div>
      </div>
    </div>
  );
};