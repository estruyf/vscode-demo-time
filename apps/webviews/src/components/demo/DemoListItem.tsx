import React from 'react';
import { Play, GripVertical, Trash2, Copy } from 'lucide-react';
import { Demo } from '../../types/demo';
import { cn } from '../../utils/cn';



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
    if (draggingIndex === null || draggingIndex === index) return;

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

  return (
    <div
      ref={rootRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        `border rounded-lg transition-all duration-300 ease-in-out`,
        isSelected ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-200 bg-white hover:shadow-md',
        isBeingDragged ? 'opacity-40 border-dashed border-blue-600 scale-105' : 'scale-100',
        !isBeingDragged && dropPosition === 'top' && 'border-t-4 border-t-blue-500',
        !isBeingDragged && dropPosition === 'bottom' && 'border-b-4 border-b-blue-500',
        demo.disabled && 'opacity-50 grayscale pointer-events-auto'
      )}
    >
      <div className="flex items-center justify-between p-4 select-none">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="cursor-move p-2 text-gray-400 hover:text-gray-700 -ml-2"
            title="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5" />
          </div>

          <div className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0" onClick={onSelect}>
            <Play className={cn("h-5 w-5 shrink-0", demo.disabled ? 'text-gray-400' : 'text-blue-600')} />
            <div className="min-w-0">
              <div className="flex items-center">
                <h4 className="font-medium text-gray-900 truncate">{demo.title}</h4>
                {demo.disabled && (
                  <span className="ml-2 px-2 py-0.5 rounded-sm bg-gray-200 text-xs text-gray-600 font-semibold border border-gray-300">Disabled</span>
                )}
              </div>
              {demo.description && (
                <p className="text-sm text-gray-600 mt-1 truncate">{demo.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {demo.steps.length} step{demo.steps.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={handleDuplicateClick}
            className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-sm transition-colors"
            title="Duplicate demo"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={handlePlayClick}
            className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-sm transition-colors"
            title="Test demo"
            disabled={demo.disabled}
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            onClick={handleRemoveClick}
            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-sm transition-colors"
            title="Remove demo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};