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
  const [nextSlideScreenshot, setNextSlideScreenshot] = React.useState<string | null>(null);

  const messageListener = (message: MessageEvent<EventData<unknown>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateCountdownStarted) {
      setCountdownStarted(payload as Date);
    } else if (command === WebViewMessages.toWebview.updateNextSlideScreenshot) {
      setNextSlideScreenshot(payload as string | null);
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
    <div className='min-h-screen'>
      <section className='bg-(--vscode-editor-background) mb-4 flex items-center justify-between sticky top-0 w-full border-b border-(--vscode-panel-border)'>
        <div className='flex gap-2 items-center py-2'>
          <StartPresentation />

          {
            showClock && countdown && (
              <StartCountdown isStarted={countdownStarted} />
            )
          }

          <NextDemo
            className='bg-transparent! hover:bg-(--vscode-button-secondaryHoverBackground)!'
            titleClass='sr-only'
            secondary />
        </div>

        <div className='flex gap-2 items-center py-2'>
          <ResetAction />
        </div>
      </section>

      <div className="max-w-7xl mx-auto space-y-4">
        <header className='flex justify-between items-center'>
          <h1 className='text-2xl'>Presenter view</h1>
        </header>

        <Demos />

        {showClock && (
          <div className="grid grid-cols-2 gap-4">
            <Clock />

            <Countdown time={countdown} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            {nextSlideScreenshot && (
              <div className="bg-(--vscode-editor-background) border border-(--vscode-panel-border) rounded p-4">
                <h2 className="text-lg font-semibold mb-3">Next Slide Preview</h2>
                <img
                  src={nextSlideScreenshot}
                  alt="Next slide preview"
                  className="w-full rounded border border-(--vscode-panel-border)"
                />
              </div>
            )}
          </div>
          <div className="flex items-end justify-end">
            <NextDemo iconClass='ml-1' />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresenterView;
