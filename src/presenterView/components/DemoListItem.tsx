import * as React from 'react';
import { Demo } from '../../models';
import { Icon } from 'vscrui';

export interface DemoListItemProps {
  demo: Demo & { executed: boolean };
  onRun: () => void;
  onOpenNotes: () => void;
}

export const DemoListItem: React.FunctionComponent<DemoListItemProps> = ({
  demo,
  onRun,
  onOpenNotes,
}) => {
  return (
    <li className="flex items-center gap-2">
      <button
        className="flex items-center p-1 space-x-2 hover:text-[var(--vscode-list-hoverForeground)] hover:bg-[var(--vscode-list-hoverBackground)] rounded-[2px]"
        onClick={onRun}
      >
        {demo.executed ? (
          <Icon
            name={demo.icons?.end as any || 'pass-filled'}
            className={demo.executed ? '!text-[var(--vscode-charts-green)]' : ''}
          />
        ) : (
          <Icon
            name={demo.icons?.start as any || 'run'}
            className={demo.executed ? '!text-[var(--vscode-charts-green)]' : ''}
          />
        )}
        <span>{demo.title}</span>
      </button>

      {demo.notes?.path && (
        <button
          className="flex items-center p-1 space-x-2 hover:text-[var(--vscode-list-hoverForeground)] hover:bg-[var(--vscode-list-hoverBackground)] rounded-[2px]"
          onClick={onOpenNotes}
        >
          <Icon name="book" />
        </button>
      )}
    </li>
  );
};