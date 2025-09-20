import React, { useState } from 'react';
import { Plus, List, Square, Play, Info } from 'lucide-react';
import { Demo, Step } from '../../types/demo';
import { DemoTestView } from './DemoTestView';
import { StepListItem } from './StepListItem';
import { StepEditor } from './StepEditor';

interface StepListProps {
  demo: Demo;
  isTestingDemo: boolean;
  onStopTesting: () => void;
  onPlayDemo: () => void;
  editingStep: { demoIndex: number; stepIndex: number } | null;
  selectedDemo: number | null;
  onAddStep: () => void;
  onRemoveStep: (stepIndex: number) => void;
  onDuplicateStep: (stepIndex: number) => void;
  onEditStep: (stepIndex: number | null) => void;
  onReorderStep: (fromIndex: number, toIndex: number) => void;
  onStepChange: (stepIndex: number, updatedStep: Step) => void;
}

export const StepList: React.FC<StepListProps> = ({
  demo,
  isTestingDemo,
  onStopTesting,
  onPlayDemo,
  editingStep,
  selectedDemo,
  onAddStep,
  onRemoveStep,
  onDuplicateStep,
  onEditStep,
  onReorderStep,
  onStepChange,
}) => {
  const [showInfo, setShowInfo] = React.useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (selectedDemo !== null) {
      onReorderStep(fromIndex, toIndex);
    }
  };

  if (isTestingDemo) {
    return (
      <DemoTestView
        demo={demo}
        onBack={onStopTesting}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Steps</h3>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xs transition-colors"
            title="About steps"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onAddStep}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            <span>Add Step</span>
          </button>
          <button
            onClick={isTestingDemo ? onStopTesting : onPlayDemo}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isTestingDemo
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-[#ffd43b] hover:bg-[#e6c135] text-gray-900'
              }`}
          >
            {isTestingDemo ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isTestingDemo ? 'Stop Test' : 'Test Demo'}</span>
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-xs text-green-700 dark:text-green-300">
            <span className="font-medium text-green-800 dark:text-green-200">About Steps:</span> A step defines an action that you want to perform for your demo. Each demo can have multiple steps.
            For example: opening GitHub Copilot chat, typing a message, and pressing enter.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {(demo?.steps || []).map((step, index) => (
          <StepListItem
            key={step.id || index}
            step={step}
            stepIndex={index}
            totalCount={demo.steps.length}
            demoIndex={selectedDemo!}
            isEditing={editingStep?.stepIndex === index && editingStep?.demoIndex === selectedDemo}
            onEdit={() => onEditStep(index)}
            onCloseEdit={() => onEditStep(null)}
            onRemove={() => onRemoveStep(index)}
            onDuplicate={() => onDuplicateStep(index)}
            onReorder={handleReorder}
            editor={
              editingStep?.stepIndex === index && editingStep?.demoIndex === selectedDemo ? (
                <StepEditor
                  step={step}
                  onChange={(updatedStep) => onStepChange(index, updatedStep)}
                />
              ) : undefined
            }
            draggingIndex={draggingIndex}
            setDraggingIndex={setDraggingIndex}
          />
        ))}

        {(demo?.steps || []).length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-300 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <List className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">No Steps Yet</h3>
            <p className="mt-1 text-sm">Click "Add Step" to start building your demo.</p>
          </div>
        )}
      </div>
    </>
  );
};
