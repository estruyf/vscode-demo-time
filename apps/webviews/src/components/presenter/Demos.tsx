import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { COMMAND, Demo, DemoFileCache, DemoFiles } from '@demotime/common';
import { EventData } from '@estruyf/vscode';
import DemoListItem from './DemoListItem';
import { Notes } from './Notes';
import { NextSlide } from './NextSlide';
import { WebViewMessages } from '@demotime/common';
import { Icon } from 'vscrui';

export const Demos = () => {
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

  const messageListener = (message: MessageEvent<EventData<unknown>>) => {
    const { command, payload } = message.data;
    if (!command) {
      return;
    }

    if (command === WebViewMessages.toWebview.updateRunningDemos) {
      setRunningDemos(payload as DemoFileCache);
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
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Demo List Card */}
      <div className="presenter-card rounded-lg border border-(--vscode-panel-border) bg-(--vscode-sideBar-background) shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
        <div className="presenter-card-header flex items-center gap-3 px-5 py-4 border-b border-(--vscode-panel-border)/50">
          <div className="flex-shrink-0 w-5 h-5 text-(--vscode-descriptionForeground)">
            <Icon name="play-circle" className="text-inherit!" />
          </div>
          <h3 className="text-base font-semibold leading-none tracking-tight text-(--vscode-foreground)">
            <span className="text-(--vscode-descriptionForeground) font-medium">Demo: </span>
            {crntDemos.title}
          </h3>
        </div>

        <div className="presenter-card-body max-h-72 overflow-y-auto">
          <ul className="divide-y divide-(--vscode-panel-border)/30">
            {crntDemos.demos.map((d, idx) => (
              <DemoListItem
                key={d.id || idx}
                demo={d}
                onRun={() => runStep(idx, d.source)}
                onOpenNotes={() => openNotes(d.notes?.path)}
                isActive={typeof crntDemo?.id !== 'undefined' ? crntDemo?.id === d.id : crntDemo?.title === d.title}
                ref={(typeof crntDemo?.id !== 'undefined' ? crntDemo?.id === d.id : crntDemo?.title === d.title) ? activeDemoRef : null}
              />
            ))}
          </ul>
        </div>
      </div>

      {/* Right Column: Next Slide and Notes */}
      {(crntDemos && crntDemos.demos) && (
        <div className="space-y-4">
          <NextSlide />
          <Notes content={notes} path={crntDemo?.notes?.path} />
        </div>
      )}
    </section>
  );
};
