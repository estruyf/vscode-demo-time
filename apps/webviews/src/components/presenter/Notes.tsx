import * as React from 'react';
import { Button, Icon } from 'vscrui';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { WebViewMessages } from '@demotime/common';
import { useRemark } from '../../hooks';

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

  const onEdit = React.useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.openFile, path);
  }, [path]);

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

        {path && (
          <Button title='Edit notes' appearance='icon' onClick={onEdit}>
            <Icon name='edit' className="text-(--vscode-descriptionForeground)!" />
          </Button>
        )}
      </div>

      {markdown ? (
        <div className="notes-container grow overflow-y-auto">
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