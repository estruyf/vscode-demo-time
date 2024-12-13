import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { Config, WebViewMessages } from '../../constants';
import { Clock } from './Clock';
import { Countdown } from './Countdown';
import { Demos } from './Demos';
import { NextDemo } from './NextDemo';
import { StartCountdown } from './StartCountdown';
import { EventData } from '@estruyf/vscode';
import { StartPresentation } from './StartPresentation';
import { ResetAction } from './ResetAction';

export interface IAppProps {}

export const App: React.FunctionComponent<IAppProps> = (props: React.PropsWithChildren<IAppProps>) => {
  const [isReady, setIsReady] = React.useState(false);
  const [showClock, setShowClock] = React.useState(false);
  const [countdown, setCountdown] = React.useState<number | undefined>(undefined);
  const [countdownStarted, setCountdownStarted] = React.useState<Date | undefined>(undefined);

  const messageListener = (message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateCountdownStarted) {
      setCountdownStarted(payload);
    }
  };

  React.useEffect(() => {
    if (!isReady) {
      setIsReady(true);

      messageHandler.send(WebViewMessages.toVscode.detach);
    }
  }, [isReady]);

  React.useEffect(() => {
    Messenger.listen(messageListener);

    messageHandler.request<boolean>(WebViewMessages.toVscode.getSetting, Config.clock.show).then((show) => {
      setShowClock(show);
    });
    
    messageHandler.request<number | undefined>(WebViewMessages.toVscode.getSetting, Config.clock.timer).then((time) => {
      setCountdown(time);
    });
    
    messageHandler.request<Date | undefined>(WebViewMessages.toVscode.getCountdownStarted).then((time) => {
      setCountdownStarted(time);
    });
        
    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  return (
    <div className='min-h-screen'>
      <section className='bg-[var(--vscode-editor-background)] mb-4 flex items-center justify-between sticky top-0 w-full border-b border-[var(--vscode-panel-border)]'>
        <div className='flex gap-2 items-center py-2'>
          <StartPresentation />

          {
            showClock && countdown && (
              <StartCountdown isStarted={countdownStarted} />
            )
          }

          <NextDemo
            className='!bg-transparent hover:!bg-[var(--vscode-button-secondaryHoverBackground)]'
            titleClass='sr-only'
            secondary />
        </div>

        <div className='flex gap-2 items-center py-2'>
          <ResetAction />
        </div>
      </section>
      
      <div className="max-w-4xl mx-auto space-y-4">

        <header className='flex justify-between items-center'>
          <h1 className='text-2xl'>Presenter view</h1>
        </header>

        <Demos />

        {showClock && (
          <div className="grid grid-cols-2 gap-4">
            <Clock />

            <Countdown isStarted={countdownStarted} />
          </div>
        )}

        <div className={`flex justify-end`}>
          <NextDemo iconClass='ml-1' />
        </div>
      </div>
    </div>
  );
};