import React from 'react';
import { ChevronRight, Trash2, Copy, Play, GripVertical } from 'lucide-react';
import { Step } from '../../types/demo';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { cn } from '../../utils/cn';
import { WebViewMessages } from '@demotime/common';

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
    if (draggingIndex === null || draggingIndex === stepIndex) { return };

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

  return (
    <div
      ref={rootRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        `relative border rounded-lg transition-all duration-300 ease-in-out`,
        isEditing ? 'z-10 border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg' : 'z-0 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md dark:hover:shadow-xl',
        resultBgColor,
        step.disabled ? 'opacity-50 grayscale' : '',
        isBeingDragged ? 'opacity-40 border-dashed border-blue-600 scale-105' : 'scale-100',
        !isBeingDragged && dropPosition === 'top' && 'border-t-4 border-t-blue-500',
        !isBeingDragged && dropPosition === 'bottom' && 'border-b-4 border-b-blue-500'
      )}
    >
      <div className="p-4 flex items-center justify-between select-none">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="cursor-move p-2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 -ml-2"
            title="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5" />
          </div>

          <div
            className={cn(
              "flex items-center justify-between flex-1 min-w-0 cursor-pointer",
            )}
            onClick={() => {
              if (isEditing) {
                onCloseEdit();
              } else {
                onEdit();
              }
            }}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Step {stepIndex + 1}:
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {step.action}
                {step.action === 'snippet' && (step.path || step.contentPath) && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-300 font-normal">{step.path || step.contentPath}</span>
                )}
                {step.action === 'runDemoById' && (step.id) && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-300 font-normal">{step.id}</span>
                )}
              </span>
              {step.disabled && (
                <span className="ml-2 px-2 py-0.5 rounded-xs bg-gray-200 text-xs text-gray-600 dark:text-gray-300 font-semibold border border-gray-300">Disabled</span>
              )}
            </div>
            <ChevronRight className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isEditing ? 'rotate-90' : ''} ml-2`} />
          </div>
        </div>

        <div className="flex items-center space-x-1 ml-4">
          <button
            onClick={handleDuplicateClick}
            disabled={step.disabled}
            className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Duplicate step"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={handlePlayClick}
            disabled={step.disabled}
            className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Test step"
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            onClick={handleRemoveClick}
            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Remove step"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
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
