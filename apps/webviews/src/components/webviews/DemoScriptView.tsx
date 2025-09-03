import { useEffect, useState } from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client';
import { EventData } from '@estruyf/vscode';
import { Loader } from 'vscrui';
import { DemoConfig } from '../../types/demo';
import { DemoScriptOverview } from '../overview';
import { WebViewMessages } from '@demotime/common';
import '../../styles/config.css';

const DemoScriptView = () => {
  const [config, setConfig] = useState<DemoConfig | undefined>(undefined);

  useEffect(() => {
    messageHandler.request<DemoConfig>(WebViewMessages.toVscode.configEditor.getContents)
      .then((response: DemoConfig) => {
        setConfig(response);
      })
      .catch((error: Error) => {
        console.error('Error loading demo config:', error.message);
        setConfig(undefined);
      });

    function messageListener(message: MessageEvent<EventData<unknown>>) {
      const { command, payload } = message.data;
      if (command === WebViewMessages.toWebview.configEditor.updateConfigContents) {
        setConfig(payload as DemoConfig);
      }
    }

    Messenger.listen(messageListener);

    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  if (!config) {
    return <Loader />;
  }

  return <DemoScriptOverview config={config} />;
};

export default DemoScriptView;
