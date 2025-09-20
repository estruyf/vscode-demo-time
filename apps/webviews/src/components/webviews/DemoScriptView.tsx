import { useEffect, useState } from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client';
import { EventData } from '@estruyf/vscode';
import { Loader } from 'vscrui';
import { DemoOverviewContainer } from '../overview';
import { DemoFileData } from '../../types/demoOverview';
import { DemoConfig, WebViewMessages } from '@demotime/common';
import '../../styles/config.css';
import { ThemeProvider } from '../../providers/ThemeProvider';

const DemoScriptView = () => {
  const [demoConfigs, setDemoConfigs] = useState<{ [key: string]: DemoConfig } | undefined>(undefined);
  const [files, setFiles] = useState<string[] | undefined>(undefined);

  // Transform the data into the format needed by DemoOverviewContainer
  const transformToDemoFileData = (configs: Record<string, DemoConfig>, fileNames: string[]): DemoFileData[] => {
    let globalIndex = 1;
    return fileNames.reduce<DemoFileData[]>((acc, filePath) => {
      const config = configs[filePath];
      if (!config) {
        console.warn(`Missing DemoConfig for file: ${filePath}`);
        return acc; // skip unknown entries
      }
      const startingIndex = globalIndex;
      const demoCount = (config.demos ?? []).length;
      globalIndex += demoCount;
      acc.push({
        fileName: filePath.replace(/^.*[\\/]/, ''),
        filePath,
        config,
        startingIndex,
      });
      return acc;
    }, []);
  };

  const updateFileData = async () => {
    try {
      const response = await messageHandler.request<{
        demos: Record<string, DemoConfig>;
        fileNames: string[];
      }>(WebViewMessages.toVscode.overview.getFiles);
      if (!response?.demos || !response?.fileNames) {
        throw new Error('Invalid response shape');
      }
      setDemoConfigs(response.demos);
      setFiles(response.fileNames);
    } catch (error) {
      console.error('Error loading demo config:', (error as Error).message);
      // show an empty state instead of an endless Loader
      setDemoConfigs({});
      setFiles([]);
    }
  };

  useEffect(() => {
    updateFileData();

    function messageListener(message: MessageEvent<EventData<unknown>>) {
      const { command } = message.data;

      if (command === WebViewMessages.toWebview.overview.update) {
        updateFileData();
      }
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
