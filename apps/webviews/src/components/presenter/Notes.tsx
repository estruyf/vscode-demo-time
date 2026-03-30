import * as React from 'react';
import { Button, Icon } from 'vscrui';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { WebViewMessages } from '@demotime/common';
import { useRemark } from '../../hooks';

const FONT_SIZE_KEY = 'presenter-notes-font-size';
const MIN_FONT_SIZE = 0.75;
const MAX_FONT_SIZE = 2.0;
const FONT_SIZE_STEP = 0.125;
const DEFAULT_FONT_SIZE = 1;

export interface INotesProps {
  content?: string;
  path?: string;
}

export const Notes: React.FunctionComponent<INotesProps> = ({
  content,
  path
}: React.PropsWithChildren<INotesProps>) => {
  const {
    markdown,
    setMarkdown
  } = useRemark();

  const [fontSize, setFontSize] = React.useState<number>(() => {
    const stored = localStorage.getItem(FONT_SIZE_KEY);
    return stored ? parseFloat(stored) : DEFAULT_FONT_SIZE;
  });

  const onEdit = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.openFile, path);
  }, [path]);

  const increaseFontSize = React.useCallback(() => {
    setFontSize(prev => {
      const next = Math.min(MAX_FONT_SIZE, parseFloat((prev + FONT_SIZE_STEP).toFixed(3)));
      localStorage.setItem(FONT_SIZE_KEY, String(next));
      return next;
    });
  }, []);

  const decreaseFontSize = React.useCallback(() => {
    setFontSize(prev => {
      const next = Math.max(MIN_FONT_SIZE, parseFloat((prev - FONT_SIZE_STEP).toFixed(3)));
      localStorage.setItem(FONT_SIZE_KEY, String(next));
      return next;
    });
  }, []);

  React.useEffect(() => {
    setMarkdown(content || "");
  }, [content]);

  return (
    <div className="presenter-card rounded-lg border border-(--vscode-panel-border) bg-(--vscode-sideBar-background) shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col">
      <div className="presenter-card-header flex items-center justify-between gap-3 px-5 py-4 border-b border-(--vscode-panel-border)/50">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-5 h-5 text-(--vscode-descriptionForeground)">
            <Icon name="notebook" className="text-inherit!" />
          </div>
          <h3 className="text-base font-semibold leading-none tracking-tight text-(--vscode-foreground)">
            Presenter Notes
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <Button
            title='Decrease font size'
            appearance='icon'
            onClick={decreaseFontSize}
            disabled={fontSize <= MIN_FONT_SIZE}
          >
            <span className="text-(--vscode-descriptionForeground) text-xs font-bold leading-none select-none">A−</span>
          </Button>
          <Button
            title='Increase font size'
            appearance='icon'
            onClick={increaseFontSize}
            disabled={fontSize >= MAX_FONT_SIZE}
          >
            <span className="text-(--vscode-descriptionForeground) font-bold leading-none select-none">A+</span>
          </Button>
          {path && (
            <Button title='Edit notes' appearance='icon' onClick={onEdit}>
              <Icon name='edit' className="text-(--vscode-descriptionForeground)!" />
            </Button>
          )}
        </div>
      </div>

      {markdown ? (
        <div className="notes-container grow overflow-y-auto" style={{ fontSize: `${fontSize}rem` }}>
          {markdown}
        </div>
      ) : (
        <div className="presenter-card-body px-5 py-8 text-center">
          <p className="text-(--vscode-descriptionForeground) text-sm italic">
            No notes available for this demo
          </p>
        </div>
      )}
    </div>
  );
};