import * as React from 'react';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { Config, WebViewMessages } from '../../constants';
import { Icon } from 'vscrui';
import { Clock } from './Clock';
import { Countdown } from './Countdown';
import { Demos } from './Demos';
import { NextDemo } from './NextDemo';

export interface IAppProps {}

export const App: React.FunctionComponent<IAppProps> = (props: React.PropsWithChildren<IAppProps>) => {
  const [showClock, setShowClock] = React.useState(false);

  React.useEffect(() => {    
    messageHandler.request<boolean>(WebViewMessages.toVscode.getSetting, Config.clock.show).then((show: boolean) => {
      setShowClock(show);
    });
  }, []);

  return (
    <div className='min-h-screen py-8'>
      <div className="max-w-4xl mx-auto space-y-4">
      <h1 className='text-2xl'>Presenter view</h1>

        {showClock && (
          <div className="grid grid-cols-2 gap-4">
            <Clock />
            <Countdown />
          </div>
        )}

        <Demos />

        <NextDemo />
      </div>
    </div>
  );
};