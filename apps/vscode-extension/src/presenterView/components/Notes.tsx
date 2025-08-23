import * as React from 'react';
import { useRemark } from '../../preview/hooks/useRemark';
import { DemoHeader } from './DemoHeader';
import { Button, Icon } from 'vscrui';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { WebViewMessages } from '@demotime/common';

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
    <div className="rounded-[2px] border border-(--vscode-panel-border) shadow-xs flex flex-col">
      <div className='flex justify-between items-center'>
        <DemoHeader title={`Presenter notes`} />

        {path && (
          <div className="p-4">
            <Button title='Edit notes' appearance='icon' onClick={onEdit}>
              <Icon name='edit' />
            </Button>
          </div>
        )}
      </div>

      {
        markdown ? (
          <div className="notes-container grow">
            {markdown}
          </div>
        ) : (
          <div className="no-notes"></div>
        )
      }
    </div >
  );
};