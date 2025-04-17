import * as React from 'react';
import { Demo, DemoFileCache, DemoFiles } from '../../models';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { COMMAND, WebViewMessages } from '../../constants';
import { EventData } from '@estruyf/vscode';
import { DemoHeader } from './DemoHeader';
import { DemoListItem } from './DemoListItem';

export interface IDemosProps {
  setNotes: (notes: string | undefined) => void;
}

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

  const runStep = React.useCallback((idx: number, demo: Demo) => {
    if (demo.notes?.path) {
      props.setNotes(undefined);
      messageHandler.request<string | undefined>(WebViewMessages.toVscode.getNotes, {
        path: demo.notes.path
      }).then((notes) => {
        props.setNotes(notes);
      });
    } else {
      props.setNotes(undefined);
    }
    messageHandler.send(WebViewMessages.toVscode.runCommand, {
      command: COMMAND.runStep,
      args: {
        filePath: runningDemos?.filePath,
        idx: idx,
        demo: demo,
      }
    });
  }, [runningDemos]);

  const openNotes = React.useCallback((path?: string) => {
    if (!path) {
      return;
    }

    messageHandler.send(WebViewMessages.toVscode.openNotes, {
      path
    });
  }, []);

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
        steps: d.steps,
        source: Object.assign({}, d),
        notes: d.notes,
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
      <DemoHeader title={crntDemos.title} />

      <div className="p-4 pt-0">
        <ul className="">
          {
            crntDemos && crntDemos.demos.map((d, idx) => (
              <DemoListItem
                key={d.id || idx}
                demo={d}
                onRun={() => runStep(idx, d.source)}
                onOpenNotes={() => openNotes(d.notes?.path)}
              />
            ))
          }
        </ul>
      </div>
    </div>
  );
};