import React from 'react';
import { Play, GripVertical, Trash2, Copy } from 'lucide-react';
import { Demo } from '../../types/demo';
import { cn } from '../../utils/cn';
import { getActionDotColor } from '../../utils/actionHelpers';

// Maximum number of move dots to render before collapsing into a "+N" label.
const MAX_DOTS = 7;

interface DemoListItemProps {
  demo: Demo;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDuplicate: () => void;
  onPlay: () => void;
  draggingIndex: number | null;
  setDraggingIndex: (index: number | null) => void;
}

export const DemoListItem: React.FC<DemoListItemProps> = ({
  demo,
  index,
  isSelected,
  onSelect,
  onRemove,
  onReorder,
  onDuplicate,
  onPlay,
  draggingIndex,
  setDraggingIndex,
}) => {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [dropPosition, setDropPosition] = React.useState<'top' | 'bottom' | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    setTimeout(() => {
      if (setDraggingIndex) {
        setDraggingIndex(index);
      }
    }, 0);
  };

  const handleDragEnd = () => {
    // Safeguard to prevent crashes if the component re-renders unexpectedly.
    if (typeof setDraggingIndex === 'function') {
      setDraggingIndex(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === index) { return; }

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
    const fromIndex = draggingIndex;

    // Reset local UI state before triggering parent state changes.
    // This prevents race conditions between onReorder and handleDragEnd.
    setDropPosition(null);
    if (typeof setDraggingIndex === 'function') {
      setDraggingIndex(null);
    }

    if (fromIndex !== null && fromIndex !== index) {
      onReorder(fromIndex, index);
    }
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  };

  const handleDuplicateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate();
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay();
  };

  const isBeingDragged = draggingIndex === index;

  const steps = demo.steps || [];
  const visibleSteps = steps.slice(0, MAX_DOTS);
  const overflow = steps.length - visibleSteps.length;

  return (
    <div
      ref={rootRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'group relative rounded-lg border transition-colors duration-200',
        isSelected
          ? 'border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-900/20'
          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/40',
        isBeingDragged && 'opacity-40',
        demo.disabled && 'opacity-60'
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
        {/* Drag handle - revealed on hover / when selected */}
        <div
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={(e) => e.stopPropagation()}
          title="Drag to reorder"
          className={cn(
            'cursor-move shrink-0 text-gray-400 dark:text-gray-500 transition-opacity',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Clickable content: number + title + moves summary */}
        <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
          <span
            className={cn(
              'shrink-0 w-7 text-center text-lg font-semibold tabular-nums',
              isSelected ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'
            )}
          >
            {String(index + 1).padStart(2, '0')}
          </span>

          <div className="min-w-0 flex-1">
            <h4
              className="font-semibold text-gray-900 dark:text-white truncate"
              title={demo.title}
            >
              {demo.title || <span className="text-gray-400 dark:text-gray-500">Untitled scene</span>}
            </h4>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
                {steps.length} move{steps.length !== 1 ? 's' : ''}
              </span>
              {steps.length > 0 && (
                <div className="flex items-center gap-1 min-w-0">
                  {visibleSteps.map((step, i) => (
                    <span
                      key={i}
                      className={cn('h-2 w-2 rounded-full shrink-0', getActionDotColor(step.action))}
                      title={step.action}
                    />
                  ))}
                  {overflow > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-0.5">+{overflow}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side: disabled badge (at rest) and actions (on hover / when selected) */}
        <div className="shrink-0 flex items-center">
          {demo.disabled && !isSelected && (
            <span className="group-hover:hidden px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700">
              Disabled
            </span>
          )}
          <div className={cn('items-center gap-1', isSelected ? 'flex' : 'hidden group-hover:flex')}>
            <button
              onClick={handlePlayClick}
              className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Test scene"
              disabled={demo.disabled}
            >
              <Play className="h-4 w-4" />
            </button>
            <button
              onClick={handleDuplicateClick}
              className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
              title="Duplicate scene"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={handleRemoveClick}
              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
              title="Remove scene"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
