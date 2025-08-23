import * as React from 'react';
import { Demo, DemoFileCache, DemoFiles } from '../../models';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { COMMAND } from '../../constants';
import { EventData } from '@estruyf/vscode';
import { DemoHeader } from './DemoHeader';
import DemoListItem from './DemoListItem';
import { Notes } from './Notes';
import { WebViewMessages } from '@demotime/common';

export interface IDemosProps { }

export const Demos: React.FunctionComponent<IDemosProps> = ({ }: React.PropsWithChildren<IDemosProps>) => {
  const [demoFiles, setDemoFiles] = React.useState<DemoFiles | null>(null);
  const [runningDemos, setRunningDemos] = React.useState<DemoFileCache | null>(null);
  const [notes, setNotes] = React.useState<string | undefined>(undefined);
  const [crntDemo, setCrntDemo] = React.useState<Demo | undefined>(undefined);

  const activeDemoRef = React.useRef<HTMLLIElement | null>(null);

  const checkToSetNotes = React.useCallback((demo?: Demo) => {
    if (demo?.notes?.path) {
      setNotes(undefined);
      messageHandler.request<string | undefined>(WebViewMessages.toVscode.getNotes, {
        path: demo.notes.path
      }).then((notes) => {
        setNotes(notes);
      });
    } else {
      setNotes(undefined);
    }
  }, [setNotes]);

  const messageListener = (message: MessageEvent<EventData<any>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateRunningDemos) {
      setRunningDemos(payload);
    } else if (command === WebViewMessages.toWebview.resetNotes) {
      setNotes(undefined);
    }
  };

  const runStep = React.useCallback((idx: number, demo: Demo) => {
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
    messageHandler.request<Demo | undefined>(WebViewMessages.toVscode.getCurrentDemo).then((demo) => {
      setCrntDemo(demo);
      checkToSetNotes(demo);
    });
  }, [crntDemos?.demos]);

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

  React.useEffect(() => {
    if (activeDemoRef.current) {
      activeDemoRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [crntDemo]);

  if (!crntDemos) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-[2px] border border-(--vscode-panel-border) shadow-xs">
        <DemoHeader prefix='Demo' title={crntDemos.title} />

        <div className="p-4 pt-0 max-h-64 overflow-y-auto">
          <ul className="">
            {
              crntDemos && crntDemos.demos.map((d, idx) => (
                <DemoListItem
                  key={d.id || idx}
                  demo={d}
                  onRun={() => runStep(idx, d.source)}
                  onOpenNotes={() => openNotes(d.notes?.path)}
                  isActive={typeof crntDemo?.id !== 'undefined' ? crntDemo?.id === d.id : crntDemo?.title === d.title}
                  ref={(typeof crntDemo?.id !== 'undefined' ? crntDemo?.id === d.id : crntDemo?.title === d.title) ? activeDemoRef : null}
                />
              ))
            }
          </ul>
        </div>
      </div>

      {
        (crntDemos && crntDemos.demos) && (
          <Notes content={notes} path={crntDemo?.notes?.path} />
        )
      }
    </div>
  );
};