import * as React from 'react';
import { Demo, DemoFileCache, DemoFiles } from '../../models';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { COMMAND, WebViewMessages } from '../../constants';
import { Icon } from 'vscrui';
import { EventData } from '@estruyf/vscode';

export interface IDemosProps {}

export const Demos: React.FunctionComponent<IDemosProps> = (props: React.PropsWithChildren<IDemosProps>) => {
  const [demoFiles, setDemoFiles] = React.useState<DemoFiles | null>(null);
  const [runningDemos, setRunningDemos] = React.useState<DemoFileCache | null>(null);

  const messageListener = (message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateRunningDemos) {
      setRunningDemos(payload);
    }
  };

  const runStep = React.useCallback((idx:number, demo: Demo) => {
    messageHandler.send(WebViewMessages.toVscode.runCommand, {
      command: COMMAND.runStep,
      args: {
        filePath: runningDemos?.filePath,
        idx: idx,
        demo: demo,
      }
    });
  }, [runningDemos]);

  const crntDemos = React.useMemo(() => {
    if (!demoFiles || !runningDemos) {
      return null;
    }
    
    const file = demoFiles[runningDemos.filePath];
    if (!file) {
      return null;
    }

    return {
      ...file,
      demos: file.demos.map((d, idx) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        icons: d.icons,
        source: Object.assign({}, d),
        executed: runningDemos.demo.findIndex((rd) => rd.id ? rd.id === d.id : rd.idx === idx) !== -1
      }))
    };
  }, [demoFiles, runningDemos]);

  React.useEffect(() => {
    Messenger.listen(messageListener);
    messageHandler.request<DemoFiles | null>(WebViewMessages.toVscode.getDemoFiles).then((files: DemoFiles | null) => {
      setDemoFiles(files);
    });

    messageHandler.request<DemoFileCache | null>(WebViewMessages.toVscode.getRunningDemos).then((demoFile: DemoFileCache | null) => {
      setRunningDemos(demoFile);
    });
    
    return () => {
      Messenger.unlisten(messageListener);
    };
  }, []);

  if (!crntDemos) {
    return null;
  }

  return (
    <div className="rounded-[2px] border border-[var(--vscode-panel-border)] shadow-sm">
      <div className="flex flex-col space-y-1.5 p-4">
        <h3 className="text-xl font-semibold leading-none tracking-tight">
          Demo: {crntDemos.title}
        </h3>
      </div>
      
      <div className="p-4 pt-0">
        <ul className="space-y-2">
          {
            crntDemos && crntDemos.demos.map((d, idx) => (
              <li key={d.id || idx} className="flex justify-between items-center">
                <button 
                  className="flex items-center space-x-2"
                  onClick={() => runStep(idx, d.source)}>
                  {
                    d.executed ? (
                      <Icon name={d.icons?.end as any || "pass-filled"} className={d.executed ? "!text-[var(--vscode-charts-green)]" : ""} />
                    ) : (
                      <Icon name={d.icons?.start as any || "run"} className={d.executed ? "!text-[var(--vscode-charts-green)]" : ""} />
                    )}
                  <span>{d.title}</span>
                </button>
              </li>
            ))
          }
        </ul>
      </div>
    </div>
  );
};