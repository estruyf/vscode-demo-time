import * as React from 'react';
import { WebViewMessages } from '../../constants';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { EventData } from '@estruyf/vscode';
import { Icon } from 'vscrui';

export interface IDemosProps {}

export const Demos: React.FunctionComponent<IDemosProps> = () => {
  const [demoFiles, setDemoFiles] = React.useState<any>({});
  const [runningDemos, setRunningDemos] = React.useState<any>(null);
  const [currentDemo, setCurrentDemo] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  const messageListener = React.useCallback((message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    
    if (!command) {
      return;
    }

    switch (command) {
      case WebViewMessages.toWebview.updateDemoFiles:
        setDemoFiles(payload || {});
        setLoading(false);
        break;
      case WebViewMessages.toWebview.updateRunningDemos:
        setRunningDemos(payload);
        break;
      case WebViewMessages.toWebview.updateCurrentDemo:
        setCurrentDemo(payload);
        break;
    }
  }, []);

  React.useEffect(() => {
    window.addEventListener('message', messageListener);
    return () => window.removeEventListener('message', messageListener);
  }, [messageListener]);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      messageHandler.send(WebViewMessages.toVscode.getDemoFiles, {});
      messageHandler.send(WebViewMessages.toVscode.getRunningDemos, {});
      messageHandler.send(WebViewMessages.toVscode.getCurrentDemo, {});
    };

    loadData();
  }, []);

  const runDemo = (demoId: string) => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, {
      command: 'demo-time.runById',
      args: [demoId]
    });
  };

  const runStep = () => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, {
      command: 'demo-time.start'
    });
  };

  const previousStep = () => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, {
      command: 'demo-time.previous'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Icon name="loading~spin" className="w-6 h-6 mr-2" />
        <span>Loading demos...</span>
      </div>
    );
  }

  const demoFileEntries = Object.entries(demoFiles);

  if (demoFileEntries.length === 0) {
    return (
      <div className="text-center p-8 text-(--vscode-descriptionForeground)">
        <Icon name="file" className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No demo files found</p>
        <p className="text-sm mt-2">Create a demo file to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo Controls */}
      {currentDemo && (
        <div className="bg-(--vscode-editor-background) border border-(--vscode-panel-border) rounded-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-(--vscode-editor-foreground)">
              Current Demo: {currentDemo.title}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={previousStep}
                className="px-3 py-1 bg-(--vscode-button-secondaryBackground) hover:bg-(--vscode-button-secondaryHoverBackground) text-(--vscode-button-secondaryForeground) rounded text-sm"
              >
                <Icon name="arrow-left" className="w-4 h-4 mr-1" />
                Previous
              </button>
              <button
                onClick={runStep}
                className="px-3 py-1 bg-(--vscode-button-background) hover:bg-(--vscode-button-hoverBackground) text-(--vscode-button-foreground) rounded text-sm"
              >
                <Icon name="play" className="w-4 h-4 mr-1" />
                Next Step
              </button>
            </div>
          </div>
          
          {currentDemo.description && (
            <p className="text-(--vscode-descriptionForeground) text-sm mb-2">
              {currentDemo.description}
            </p>
          )}
        </div>
      )}

      {/* Demo Files List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-(--vscode-editor-foreground)">Available Demos</h2>
        
        {demoFileEntries.map(([filePath, demoFile]: [string, any]) => (
          <div key={filePath} className="bg-(--vscode-editor-background) border border-(--vscode-panel-border) rounded-md p-4">
            <h3 className="text-lg font-medium text-(--vscode-editor-foreground) mb-2">
              {demoFile.title}
            </h3>
            
            {demoFile.description && (
              <p className="text-(--vscode-descriptionForeground) text-sm mb-4">
                {demoFile.description}
              </p>
            )}

            <div className="space-y-2">
              {demoFile.demos?.map((demo: any, index: number) => {
                const isActive = currentDemo && (
                  (demo.id && currentDemo.id === demo.id) ||
                  (!demo.id && currentDemo.title === demo.title)
                );

                return (
                  <div
                    key={demo.id || index}
                    className={`flex items-center justify-between p-3 rounded border ${
                      isActive 
                        ? 'border-(--vscode-focusBorder) bg-(--vscode-list-activeSelectionBackground)' 
                        : 'border-(--vscode-panel-border) hover:bg-(--vscode-list-hoverBackground)'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-(--vscode-editor-foreground)">
                          {demo.title}
                        </h4>
                        {isActive && (
                          <span className="text-xs bg-(--vscode-badge-background) text-(--vscode-badge-foreground) px-2 py-1 rounded">
                            Active
                          </span>
                        )}
                        {demo.notes?.path && (
                          <Icon name="note" className="w-4 h-4 text-(--vscode-symbolIcon-textForeground)" title="Has notes" />
                        )}
                      </div>
                      {demo.description && (
                        <p className="text-(--vscode-descriptionForeground) text-sm mt-1">
                          {demo.description}
                        </p>
                      )}
                      <p className="text-(--vscode-descriptionForeground) text-xs mt-1">
                        {demo.steps?.length || 0} steps
                      </p>
                    </div>
                    
                    <button
                      onClick={() => runDemo(demo.id || demo.title)}
                      className="ml-4 px-3 py-1 bg-(--vscode-button-background) hover:bg-(--vscode-button-hoverBackground) text-(--vscode-button-foreground) rounded text-sm"
                      disabled={isActive}
                    >
                      <Icon name="play" className="w-4 h-4 mr-1" />
                      {isActive ? 'Running' : 'Run'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
