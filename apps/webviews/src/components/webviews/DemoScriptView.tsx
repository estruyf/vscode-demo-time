import { useEffect, useState } from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client';
import { EventData } from '@estruyf/vscode';
import { Loader } from 'vscrui';
import { DemoConfig } from '../../types/demo';
import { DemoOverviewContainer } from '../overview';
import { DemoFileData } from '../../types/demoOverview';
import { WebViewMessages } from '@demotime/common';
import '../../styles/config.css';

const DemoScriptView = () => {
  const [demoConfigs, setDemoConfigs] = useState<{ [key: string]: DemoConfig } | undefined>(undefined);
  const [files, setFiles] = useState<string[] | undefined>(undefined);

  // Transform the data into the format needed by DemoOverviewContainer
  const transformToDemoFileData = (configs: { [key: string]: DemoConfig }, fileNames: string[]): DemoFileData[] => {
    let globalIndex = 1;

    return fileNames.map((fileName) => {
      const config = configs[fileName];
      const startingIndex = globalIndex;

      // Calculate how many items this file will contribute to increment globalIndex
      const demoCount = (config.demos || []).length;
      globalIndex += demoCount;

      return {
        fileName: fileName.split('/').pop() || fileName, // Show just the filename, not full path
        filePath: fileName,
        config,
        startingIndex,
      };
    });
  };

  useEffect(() => {
    messageHandler.request<{
      demos: { [key: string]: DemoConfig },
      fileNames: string[]
    }>(WebViewMessages.toVscode.overview.getFiles)
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

  const demoFileData = transformToDemoFileData(demoConfigs, files);

  return (
    <DemoOverviewContainer
      demoFiles={demoFileData}
    />
  );
};

export default DemoScriptView;
