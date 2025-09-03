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
  const [demoConfigs, setDemoConfigs] = useState<DemoConfig[] | undefined>(undefined);
  const [files, setFiles] = useState<string[] | undefined>(undefined);

  // Transform the data into the format needed by DemoOverviewContainer
  const transformToDemoFileData = (configs: DemoConfig[], fileNames: string[]): DemoFileData[] => {
    let globalIndex = 1;
    
    return fileNames.map((fileName, index) => {
      const config = configs[index];
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

  const handleEditDemo = (fileName: string, demoIndex: number) => {
    // Send message to VS Code to open the config editor for this file and demo
    console.log(`Edit demo ${demoIndex} in file ${fileName}`);
    // In a real implementation:
    // messageHandler.send(WebViewMessages.toVscode.configEditor.openStep, { 
    //   fileName, 
    //   stepIndex: demoIndex 
    // });
  };

  const handlePlayDemo = (fileName: string, demo: any, demoIndex: number) => {
    // Send message to VS Code to run this specific demo
    console.log(`Play demo ${demoIndex} from file ${fileName}:`, demo);
    messageHandler.send(WebViewMessages.toVscode.runCommand, {
      command: 'demo-time.runDemo',
      args: { fileName, demo, demoIndex }
    });
  };
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

  const demoFileData = transformToDemoFileData(demoConfigs, files);

  return (
    <DemoOverviewContainer
      demoFiles={demoFileData}
      onEditDemo={handleEditDemo}
      onPlayDemo={handlePlayDemo}
    />
  );
};

export default DemoScriptView;
