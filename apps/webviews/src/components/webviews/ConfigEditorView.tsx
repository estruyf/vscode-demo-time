import React from 'react';
import { messageHandler, Messenger } from "@estruyf/vscode/dist/client/index.js";
import { Loader } from "vscrui";
import { EventData } from '@estruyf/vscode/dist/models';
import { DemoBuilder } from '../demo/DemoBuilder';
import { DemoConfigProvider } from '../../providers/DemoConfigProvider';
import { DemoConfig, WebViewMessages } from '@demotime/common';
import '../../styles/config.css';

const ConfigEditorView = () => {
  const [config, setConfig] = React.useState<DemoConfig | undefined>(undefined);

  React.useEffect(() => {
    messageHandler.request<DemoConfig>(WebViewMessages.toVscode.configEditor.getContents).then((response: DemoConfig) => {
      setConfig(response);
      const htmlElm = document.documentElement;
      if (htmlElm && htmlElm.hasAttribute("style")) {
        htmlElm.removeAttribute("style");
      }
    }).catch((error: Error) => {
      console.error("Error checking current path:", error.message);
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

  return (
    <DemoConfigProvider initialConfig={config}>
      <DemoBuilder />
    </DemoConfigProvider>
  );
};

export default ConfigEditorView;
