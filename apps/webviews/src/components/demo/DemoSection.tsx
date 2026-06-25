import React from 'react';
import { Plus } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { DemoListItem } from './DemoListItem';
import { Demo } from '@demotime/common';

interface DemoSectionProps {
  demos: Demo[];
  selectedDemo: number | null;
  onSelectDemo: (index: number | null) => void;
  onAddDemo: () => void;
  onRemoveDemo: (index: number) => void;
  onReorderDemo: (fromIndex: number, toIndex: number) => void;
  onPlayDemo: (index: number) => void;
  onDuplicateDemo: (index: number) => void;
  onToggleDemoDisabled?: (index: number, disabled: boolean) => void;
  version?: number;
}

export const DemoSection: React.FC<DemoSectionProps> = ({
  demos,
  selectedDemo,
  onSelectDemo,
  onAddDemo,
  onRemoveDemo,
  onReorderDemo,
  onPlayDemo,
  onDuplicateDemo,
}) => {
  // Drag-and-drop state for the drop zone
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);
  const [dropZoneActive, setDropZoneActive] = React.useState(false);

  // Drop zone handlers for before the first item
  const handleDropZoneDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggingIndex !== null && draggingIndex !== 0) {
      setDropZoneActive(true);
    }
  };
  const handleDropZoneDragLeave = () => {
    setDropZoneActive(false);
  };
  const handleDropZoneDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropZoneActive(false);
    if (draggingIndex !== null && draggingIndex !== 0) {
      onReorderDemo(draggingIndex, 0);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Scenes
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold tabular-nums">
            {(demos || []).length}
          </span>
        </div>
        <Button
          variant="dark"
          onClick={onAddDemo}
          icon={Plus}
          size="sm"
        >
          Add
        </Button>
      </div>

      <div className="space-y-1">
        {/* Drop zone before the first item */}
        <div
          onDragOver={handleDropZoneDragOver}
          onDragLeave={handleDropZoneDragLeave}
          onDrop={handleDropZoneDrop}
          style={{ minHeight: 12, marginBottom: 2, borderRadius: 4, border: dropZoneActive ? '2px solid #3b82f6' : '2px solid transparent', transition: 'border 0.2s' }}
        />
        {(demos || []).map((demo, index) => (
          <DemoListItem
            key={index}
            demo={demo}
            index={index}
            isSelected={selectedDemo === index}
            onSelect={() => onSelectDemo(selectedDemo === index ? null : index)}
            onRemove={() => onRemoveDemo(index)}
            onReorder={onReorderDemo}
            onPlay={() => onPlayDemo(index)}
            onDuplicate={() => onDuplicateDemo(index)}
            draggingIndex={draggingIndex}
            setDraggingIndex={setDraggingIndex}
          />
        ))}
      </div>
    </Card>
  );
};
