import { Demo } from '@demotime/common';
import * as React from 'react';
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
    <li
      ref={ref}
      className={`
        flex items-center gap-2 px-4 py-2.5 transition-colors duration-150
        ${isActive
          ? 'bg-(--vscode-list-activeSelectionBackground) text-(--vscode-list-activeSelectionForeground)'
          : 'hover:bg-(--vscode-list-hoverBackground)'
        }
      `}
    >
      <button
        className="flex-1 flex items-center gap-3 text-left transition-colors duration-150"
        onClick={onRun}
      >
        <span className={`
          flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full
          ${demo.executed
            ? 'text-(--vscode-charts-green)'
            : isActive
              ? 'text-(--vscode-list-activeSelectionForeground)'
              : 'text-(--vscode-descriptionForeground)'
          }
        `}>
          {demo.executed ? (
            <Icon
              name={demo.icons?.end as never || 'pass-filled'}
              className="text-inherit!"
            />
          ) : (
            <Icon
              name={demo.icons?.start as never || 'run'}
              className="text-inherit!"
            />
          )}
        </span>
        <span className={`
          font-medium truncate
          ${isActive ? 'text-inherit' : 'text-(--vscode-foreground)'}
        `}>
          {demo.title}
        </span>
      </button>

      {demo.notes?.path && (
        <button
          className={`
            flex-shrink-0 p-1.5 rounded transition-colors duration-150
            ${isActive
              ? 'hover:bg-(--vscode-list-activeSelectionBackground)/80'
              : 'hover:bg-(--vscode-list-hoverBackground)'
            }
          `}
          onClick={onOpenNotes}
          title="Open notes"
        >
          <Icon
            name="book"
            className={`
              w-4 h-4
              ${isActive ? 'text-inherit!' : 'text-(--vscode-descriptionForeground)!'}
            `}
          />
        </button>
      )}
    </li>
  );
});

export default DemoListItem;
