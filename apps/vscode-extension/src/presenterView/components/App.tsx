import * as React from 'react';
import { EventData } from '@estruyf/vscode';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { WebViewMessages } from '../../constants';
import { Demos } from './Demos';
import { StartPresentation } from './StartPresentation';
import { NextDemo } from './NextDemo';
import { StartCountdown } from './StartCountdown';
import { ResetAction } from './ResetAction';
import { Clock } from './Clock';
import { NotesView } from './NotesView';

export interface IAppProps {}

export const App: React.FunctionComponent<IAppProps> = (props: React.PropsWithChildren<IAppProps>) => {
  const [presentationStarted, setPresentationStarted] = React.useState<boolean>(false);
  const [countdownStarted, setCountdownStarted] = React.useState<boolean>(false);
  const [countdown, setCountdown] = React.useState<string>('');
  const [showClock, setShowClock] = React.useState<boolean>(false);
  const [currentDemo, setCurrentDemo] = React.useState<any>(null);
  const [currentStepIndex, setCurrentStepIndex] = React.useState<number | undefined>(undefined);

  const messageListener = React.useCallback((message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    switch (command) {
      case WebViewMessages.toWebview.updatePresentationStarted:
        setPresentationStarted(payload);
        break;
      case WebViewMessages.toWebview.updateCountdownStarted:
        setCountdownStarted(payload);
        break;
      case WebViewMessages.toWebview.updateClock:
        setCountdown(payload);
        break;
      case WebViewMessages.toWebview.updateShowClock:
        setShowClock(payload);
        break;
      case WebViewMessages.toWebview.updateCurrentDemo:
        setCurrentDemo(payload);
        break;
      case WebViewMessages.toWebview.updateCurrentStepIndex:
        setCurrentStepIndex(payload);
        break;
    }
  }, []);

  React.useEffect(() => {
    window.addEventListener('message', messageListener);
    return () => window.removeEventListener('message', messageListener);
  }, [messageListener]);

  React.useEffect(() => {
    const getData = async () => {
      // Request initial data
      messageHandler.send(WebViewMessages.toVscode.getPresentationStarted, {});
      messageHandler.send(WebViewMessages.toVscode.getCountdownStarted, {});
      messageHandler.send(WebViewMessages.toVscode.getCurrentDemo, {});
      
      // Get clock settings
      const clockSetting = await messageHandler.request(WebViewMessages.toVscode.getSetting, 'demoTime.clock.show');
      setShowClock(clockSetting);
      
      if (clockSetting) {
        messageHandler.send(WebViewMessages.toVscode.getTimer, {});
      }
    };

    getData();
  }, []);

  return (
    <div className='min-h-screen'>
      <section className='bg-(--vscode-editor-background) mb-4 flex items-center justify-between sticky top-0 w-full border-b border-(--vscode-panel-border) z-10'>
        <div className='flex gap-2 items-center py-2 px-4'>
          <StartPresentation />

          {showClock && countdown && (
            <StartCountdown isStarted={countdownStarted} />
          )}

          <NextDemo
            className='bg-transparent! hover:bg-(--vscode-button-secondaryHoverBackground)!'
            titleClass='sr-only'
            secondary />
        </div>

        <div className='flex gap-2 items-center py-2 px-4'>
          <ResetAction />
        </div>
      </section>

      <div className="max-w-7xl mx-auto space-y-4 px-4">
        <header className='flex justify-between items-center'>
          <h1 className='text-2xl font-bold text-(--vscode-editor-foreground)'>Presenter view</h1>
        </header>

        {/* Notes View Section */}
        <div className="space-y-4">
          <NotesView 
            currentDemo={currentDemo}
            currentStepIndex={currentStepIndex}
          />
        </div>

        <Demos />

        {showClock && countdown && (
          <div className="flex justify-center">
            <Clock countdown={countdown} />
          </div>
        )}
      </div>
    </div>
  );
};
