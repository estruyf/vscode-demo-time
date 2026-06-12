import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { EventData } from '@estruyf/vscode';
import { Config, WebViewMessages } from "@demotime/common";
import '../../styles/presenter.css';
import { Clock, Countdown, Demos, NextDemo, ResetAction, StartCountdown, StartPresentation } from '../presenter';

const PresenterView = () => {
  const [isReady, setIsReady] = React.useState(false);
  const [showClock, setShowClock] = React.useState(false);
  const [countdown, setCountdown] = React.useState<number | undefined>(undefined);
  const [countdownStarted, setCountdownStarted] = React.useState<Date | undefined>(undefined);

  const messageListener = (message: MessageEvent<EventData<unknown>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateCountdownStarted) {
      setCountdownStarted(payload as Date);
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

    messageHandler.request<number | undefined>(WebViewMessages.toVscode.getTimer).then((time) => {
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
    <div className='presenter-view min-h-screen bg-(--vscode-editor-background)'>
      {/* Professional Header Bar */}
      <header className='presenter-header bg-(--vscode-sideBar-background) sticky top-0 z-50 border-b border-(--vscode-panel-border) shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 py-3 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <h1 className='text-lg font-semibold text-(--vscode-foreground) tracking-tight'>
              Presenter View
            </h1>
            <div className='h-5 w-px bg-(--vscode-panel-border)'></div>
            <div className='flex items-center gap-2'>
              <StartPresentation />
              {showClock && countdown && (
                <StartCountdown isStarted={countdownStarted} />
              )}
              <NextDemo
                className='bg-transparent! hover:bg-(--vscode-button-secondaryHoverBackground)!'
                titleClass='sr-only'
                secondary />
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <ResetAction />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className='max-w-7xl mx-auto px-4 py-6 space-y-6'>
        {/* Demo List and Notes Section */}
        <Demos />

        {/* Clock and Countdown Section */}
        {showClock && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Clock />
            <Countdown time={countdown} />
          </section>
        )}

        {/* Navigation Footer */}
        <footer className='flex justify-end pt-2'>
          <NextDemo iconClass='ml-2' />
        </footer>
      </main>
    </div>
  );
};

export default PresenterView;
