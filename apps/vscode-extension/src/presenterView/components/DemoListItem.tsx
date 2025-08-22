import * as React from 'react';
import { Demo } from '../../models';
import { Icon } from 'vscrui';

export interface DemoListItemProps {
  demo: Demo & { executed: boolean };
  isActive: boolean;
  onRun: () => void;
  onOpenNotes: () => void;
}

const DemoListItem = React.forwardRef<HTMLLIElement, DemoListItemProps>(({
  demo,
  isActive,
  onRun,
  onOpenNotes,
}, ref) => {
  return (
    <li ref={ref} className={`flex items-center gap-2 ${isActive ? 'bg-(--vscode-list-activeSelectionBackground)' : ''}`}>
      <button
        className="flex items-center p-1 space-x-2 hover:text-(--vscode-list-hoverForeground) hover:bg-(--vscode-list-hoverBackground) rounded-[2px]"
        onClick={onRun}
      >
        {demo.executed ? (
          <Icon
            name={demo.icons?.end as any || 'pass-filled'}
            className={demo.executed ? 'text-(--vscode-charts-green)!' : ''}
          />
        ) : (
          <Icon
            name={demo.icons?.start as any || 'run'}
            className={demo.executed ? 'text-(--vscode-charts-green)!' : ''}
          />
        )}
        <span>{demo.title}</span>
      </button>

      {demo.notes?.path && (
        <button
          className="flex items-center p-1 space-x-2 hover:text-(--vscode-list-hoverForeground) hover:bg-(--vscode-list-hoverBackground) rounded-[2px]"
          onClick={onOpenNotes}
        >
          <Icon name="book" />
        </button>
      )}
    </li>
  );
});

export default DemoListItem;