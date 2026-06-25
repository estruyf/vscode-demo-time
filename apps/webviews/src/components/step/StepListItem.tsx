import React from 'react';
import { ChevronRight, Trash2, Copy, Play, GripVertical } from 'lucide-react';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { cn } from '../../utils/cn';
import { getActionDotColor, getActionLabel } from '../../utils/actionHelpers';
import { Action, Step, WebViewMessages } from '@demotime/common';

interface StepListItemProps {
  step: Step;
  stepIndex: number;
  totalCount: number;
  demoIndex: number;
  isEditing: boolean;
  onEdit: () => void;
  onCloseEdit: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  editor?: React.ReactNode;
  draggingIndex: number | null;
  setDraggingIndex: (index: number | null) => void;
  isSelected?: boolean;
  onToggleSelect?: (selected: boolean, shiftKey: boolean) => void;
  selectionActive?: boolean;
}

export const StepListItem: React.FC<StepListItemProps> = ({
  step,
  stepIndex,
  totalCount,
  isEditing,
  onEdit,
  onCloseEdit,
  onRemove,
  onDuplicate,
  onReorder,
  editor,
  draggingIndex,
  setDraggingIndex,
  isSelected = false,
  onToggleSelect,
  selectionActive = false,
}) => {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const wasEditing = React.useRef(isEditing);
  const [dropPosition, setDropPosition] = React.useState<'top' | 'bottom' | null>(null);

  React.useEffect(() => {
    if (isEditing && !wasEditing.current && rootRef.current) {
      const block = (stepIndex === totalCount - 1) ? 'end' : 'center';
      rootRef.current.scrollIntoView({ behavior: 'smooth', block });
    }
    wasEditing.current = isEditing;
  }, [isEditing, stepIndex, totalCount]);

  const [resultBgColor, setResultBgColor] = React.useState<string | undefined>(undefined);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(stepIndex));
    setTimeout(() => {
      setDraggingIndex(stepIndex);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === stepIndex) { return; };

    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const midpointY = rect.top + rect.height / 2;
      setDropPosition(e.clientY < midpointY ? 'top' : 'bottom');
    }
  };

  const handleDragLeave = () => {
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggingIndex !== null && draggingIndex !== stepIndex) {
      onReorder(draggingIndex, stepIndex);
    }
    setDropPosition(null);
    setDraggingIndex(null);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  };

  const handleDuplicateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate();
  };

  const handlePlayClick = React.useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      setResultBgColor('bg-blue-100 animate-pulse');
      const result = await messageHandler.request<{ success: boolean; error?: string }>(
        WebViewMessages.toVscode.configEditor.runDemoStep,
        { step }
      );

      if (result.success) {
        setResultBgColor('bg-green-100');
      } else {
        setResultBgColor('bg-red-100');
      }

      setTimeout(() => {
        setResultBgColor(undefined);
      }, 2000);
    },
    [step]
  );

  const isBeingDragged = draggingIndex === stepIndex;

  // Secondary detail shown under the action label (path, command, target, ...).
  const detail =
    step.path ||
    step.contentPath ||
    step.command ||
    step.url ||
    (step.action === Action.RunDemoById ? step.id : undefined);

  return (
    <div
      ref={rootRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'group relative rounded-lg border transition-colors duration-200',
        isEditing
          ? 'border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-900/20'
          : isSelected
            ? 'border-blue-200 bg-blue-50/60 dark:border-blue-800/90 dark:bg-blue-900/20'
            : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/40',
        resultBgColor,
        isBeingDragged && 'opacity-40',
        step.disabled && 'opacity-60'
      )}
    >
      {/* Drop indicators */}
      {!isBeingDragged && dropPosition === 'top' && (
        <span className="absolute left-2 right-2 -top-0.5 h-0.5 rounded-full bg-blue-500" />
      )}
      {!isBeingDragged && dropPosition === 'bottom' && (
        <span className="absolute left-2 right-2 -bottom-0.5 h-0.5 rounded-full bg-blue-500" />
      )}

      <div className="flex items-center gap-2 p-3 select-none">
        {/* Selection checkbox - revealed on hover, persistent while selecting */}
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => undefined}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(e.currentTarget.checked, e.shiftKey);
            }}
            className={cn(
              'rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0 transition-opacity',
              isSelected || selectionActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            title="Select move (Shift+click to select a range)"
            aria-label={`Select move ${stepIndex + 1}`}
          />
        )}

        {/* Drag handle - revealed on hover / when editing */}
        <div
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={(e) => e.stopPropagation()}
          title="Drag to reorder"
          className={cn(
            'cursor-move shrink-0 text-gray-400 dark:text-gray-500 transition-opacity',
            isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Clickable content: number + action + detail */}
        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={() => (isEditing ? onCloseEdit() : onEdit())}
        >
          <span
            className={cn(
              'shrink-0 w-7 text-center text-lg font-semibold tabular-nums',
              isEditing ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'
            )}
          >
            {String(stepIndex + 1).padStart(2, '0')}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn('h-2 w-2 rounded-full shrink-0', getActionDotColor(step.action))} />
              <h4 className="font-semibold text-gray-900 dark:text-white truncate" title={getActionLabel(step.action)}>
                {step.action
                  ? getActionLabel(step.action)
                  : <span className="text-gray-400 dark:text-gray-500">Select an action</span>}
              </h4>
            </div>
            {detail && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5" title={detail}>
                {detail}
              </p>
            )}
          </div>
        </div>

        {/* Right side: disabled badge (at rest) and actions (on hover / when editing) */}
        <div className="shrink-0 flex items-center">
          {step.disabled && !isEditing && (
            <span className="group-hover:hidden px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700">
              Disabled
            </span>
          )}
          <div className={cn('items-center gap-1', isEditing ? 'flex' : 'hidden group-hover:flex')}>
            <button
              onClick={handleDuplicateClick}
              disabled={step.disabled}
              className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Duplicate move"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={handlePlayClick}
              disabled={step.disabled}
              className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Test move"
            >
              <Play className="h-4 w-4" />
            </button>
            <button
              onClick={handleRemoveClick}
              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
              title="Remove move"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500 transition-transform duration-200',
            isEditing && 'rotate-90'
          )}
        />
      </div>

      {editor && (
        <section className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 rounded-b-lg">
          <div className="mt-2 mb-4">
            {editor}
          </div>
        </section>
      )}
    </div>
  );
};
