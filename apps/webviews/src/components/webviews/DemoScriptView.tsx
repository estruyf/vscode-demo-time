import { useEffect, useState } from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client';
import { EventData } from '@estruyf/vscode';
import { Loader } from 'vscrui';
import { DemoConfig } from '../../types/demo';
import { DemoFilesOverview } from '../overview';
import { WebViewMessages } from '@demotime/common';
import '../../styles/config.css';

const DemoScriptView = () => {
  const [demoConfigs, setDemoConfigs] = useState<DemoConfig[] | undefined>(undefined);
  const [files, setFiles] = useState<string[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    messageHandler.request<{
      demos: DemoConfig[],
      fileNames: string[]
    }>(WebViewMessages.toVscode.configEditor.getContents)
      .then((response) => {
        setDemoConfigs(response.demos);
        setFiles(response.fileNames);
        setIsLoading(false);
      })
      .catch((error: Error) => {
        console.error('Error loading demo config:', error.message);
        setDemoConfigs(undefined);
        setFiles(undefined);
        setIsLoading(false);
      });

    function messageListener(message: MessageEvent<EventData<unknown>>) {
      const { command, payload } = message.data;
      if (command === WebViewMessages.toWebview.configEditor.updateConfigContents) {
        // Refresh data when config is updated
        const response = payload as { demos: DemoConfig[], fileNames: string[] };
        if (response.demos && response.fileNames) {
          setDemoConfigs(response.demos);
          setFiles(response.fileNames);
        }
      }
    }

    Messenger.listen(messageListener);

    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-demo-time-gray-7 flex items-center justify-center">
        <div className="text-center">
          <Loader />
          <p className="text-demo-time-gray-4 mt-4">Loading demo files...</p>
        </div>
      </div>
    );
  }

  if (!demoConfigs || !files) {
    return (
      <div className="min-h-screen bg-demo-time-gray-7 flex items-center justify-center">
        <div className="text-center">
          <p className="text-demo-time-gray-4">No demo files found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-demo-time-gray-7">
      {/* Header */}
      <div className="bg-demo-time-black shadow-sm border-b border-demo-time-gray-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-demo-time-white">Demo Script Overview</h1>
            <p className="text-demo-time-gray-4 text-sm mt-1">
              Comprehensive view of all demo files and configurations
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <DemoFilesOverview demoConfigs={demoConfigs} fileNames={files} />
      </div>
    </div>
  );
};

export default DemoScriptView;