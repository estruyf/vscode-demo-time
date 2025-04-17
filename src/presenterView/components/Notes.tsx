import * as React from 'react';
import { useRemark } from '../../preview/hooks/useRemark';

export interface INotesProps {
  content?: string;
}

export const Notes: React.FunctionComponent<INotesProps> = ({
  content,
}: React.PropsWithChildren<INotesProps>) => {
  const {
    markdown,
    setMarkdown
  } = useRemark();

  React.useEffect(() => {
    setMarkdown(content || "");
  }, [content]);

  return (
    <div className="rounded-[2px] border border-[var(--vscode-panel-border)] shadow-sm">
      {markdown ? (
        <div className="notes-container">
          {markdown}
        </div>
      ) : (
        <div className="no-notes"></div>
      )}
    </div>
  );
};