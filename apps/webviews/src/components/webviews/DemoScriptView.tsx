import { useEffect, useState } from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client';
import { EventData } from '@estruyf/vscode';
import { Loader } from 'vscrui';
import { DemoConfig } from '../../types/demo';
import { DemoScriptOverview } from '../overview';
import { WebViewMessages } from '@demotime/common';
import '../../styles/config.css';

const DemoScriptView = () => {
  const [demoConfigs, setDemoConfigs] = useState<DemoConfig[] | undefined>(undefined);
  const [files, setFiles] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    messageHandler.request<{
      demos: DemoConfig[],
      fileNames: string[]
    }>(WebViewMessages.toVscode.configEditor.getContents)
      .then((response) => {
        setDemoConfigs(response.demos);
        setFiles(response.fileNames);
      })
      .catch((error: Error) => {
        console.error('Error loading demo config:', error.message);
        setDemoConfigs(undefined);
        setFiles(undefined);
      });

    function messageListener(message: MessageEvent<EventData<unknown>>) {
      const { command, payload } = message.data;
    }

    Messenger.listen(messageListener);

    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  if (!demoConfigs || !files) {
    return <Loader />;
  }

  return (
    <div>
      {files.map((file, idx) => (
        <details key={file} style={{ marginBottom: '1rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
            {file}
          </summary>
          <DemoScriptOverview config={demoConfigs[idx]} />
        </details>
      ))}
    </div>
  );
};

export default DemoScriptView;
