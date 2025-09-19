import React from 'react';
import { Plus, Info } from 'lucide-react';
import { Demo } from '../../types/demo';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { DemoListItem } from './DemoListItem';

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
  const [showInfo, setShowInfo] = React.useState(false);

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-semibold text-demo-time-white">
            Demos ({(demos || []).length})
          </h2>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 text-demo-time-gray-4 hover:text-demo-time-gray-3 hover:bg-demo-time-gray-6 rounded-xs transition-colors"
            title="About demos"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
        <div>
          <Button
            variant="dark"
            onClick={onAddDemo}
            icon={Plus}
            size="sm"
          >
            Add Demo
          </Button>
        </div>
      </div>

      {showInfo && (
        <div className="mb-4 p-3 bg-demo-time-accent-low border border-demo-time-accent rounded-md">
          <p className="text-xs text-demo-time-accent-high">
            <span className="font-medium text-demo-time-accent-high">About Demos:</span> Each demo can consist of multiple steps that will be running in sequence right after each other.
            Create organized demonstrations by grouping related actions together.
          </p>
        </div>
      )}

      <div className="space-y-3">
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
