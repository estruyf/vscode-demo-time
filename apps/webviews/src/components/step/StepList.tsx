import React, { useState } from 'react';
import { Plus, List, Square, Play, Info, FolderInput, X } from 'lucide-react';
import { DemoTestView } from './DemoTestView';
import { StepListItem } from './StepListItem';
import { StepEditor } from './StepEditor';
import { MoveToSceneModal, MoveToSceneTarget } from './MoveToSceneModal';
import { Demo, Step } from '@demotime/common';

interface StepListProps {
  demo: Demo;
  demos: Demo[];
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
  onMoveStepsToScene: (stepIndices: number[], target: MoveToSceneTarget) => void;
}

export const StepList: React.FC<StepListProps> = ({
  demo,
  demos,
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
  onMoveStepsToScene,
}) => {
  const [showInfo, setShowInfo] = React.useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [selectedSteps, setSelectedSteps] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  const stepCount = demo?.steps?.length ?? 0;

  const clearSelection = React.useCallback(() => {
    setSelectedSteps(new Set());
    setLastSelectedIndex(null);
  }, []);

  // Reset the selection whenever the scene or its number of moves changes,
  // so we never keep stale indices around after a reorder/remove/move.
  React.useEffect(() => {
    clearSelection();
    setIsMoveModalOpen(false);
  }, [selectedDemo, stepCount, clearSelection]);

  const handleToggleSelect = (index: number, selected: boolean, shiftKey: boolean) => {
    setSelectedSteps((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedIndex !== null && lastSelectedIndex !== index) {
        // Shift+click selects (or deselects) the contiguous range between the
        // previously clicked move (anchor) and the one just clicked.
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
          if (selected) {
            next.add(i);
          } else {
            next.delete(i);
          }
        }
      } else if (selected) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
    setLastSelectedIndex(index);
  };

  const handleConfirmMove = (target: MoveToSceneTarget) => {
    onMoveStepsToScene(Array.from(selectedSteps), target);
    clearSelection();
    setIsMoveModalOpen(false);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (selectedDemo !== null) {
      // Reordering shifts indices without changing the count, so clear the
      // (index-based) selection to avoid acting on the wrong moves afterwards.
      clearSelection();
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
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Moves</h3>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xs transition-colors"
            title="About moves"
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
            <span>Add Move</span>
          </button>
          <button
            onClick={isTestingDemo ? onStopTesting : onPlayDemo}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isTestingDemo
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-[#ffd43b] hover:bg-[#e6c135] text-gray-900'
              }`}
          >
            {isTestingDemo ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isTestingDemo ? 'Stop Test' : 'Test Scene'}</span>
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-xs text-green-700 dark:text-green-300">
            <span className="font-medium text-green-800 dark:text-green-200">About Moves:</span> A move defines an action that you want to perform for your demo. Each scene can have multiple moves that will be executed in a sequence.
            For example: opening GitHub Copilot chat, typing a message, and pressing enter.
          </p>
        </div>
      )}

      <div className="space-y-1">
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
            isSelected={selectedSteps.has(index)}
            onToggleSelect={(selected, shiftKey) => handleToggleSelect(index, selected, shiftKey)}
            selectionActive={selectedSteps.size > 0}
          />
        ))}

        {(demo?.steps || []).length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-300 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <List className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">No Moves Yet</h3>
            <p className="mt-1 text-sm">Click "Add Move" to start building your demo.</p>
          </div>
        )}
      </div>

      {/* Floating action bar pinned to the bottom of the moves card. It sticks
          to the bottom of the scroll area and overlays the list, so selecting a
          move never pushes the items above it down. */}
      {selectedSteps.size > 0 && (
        <div className="selection-action-bar sticky bottom-0 z-20 -mx-6 -mb-6 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-b-lg border-t border-blue-200 dark:border-blue-800 bg-blue-50/95 dark:bg-blue-900/50 px-6 py-3 backdrop-blur-sm shadow-[0_-6px_16px_-8px_rgba(0,0,0,0.25)]">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {selectedSteps.size} move{selectedSteps.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMoveModalOpen(true)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
            >
              <FolderInput className="h-4 w-4" />
              <span>Move to scene…</span>
            </button>
            <button
              onClick={clearSelection}
              className="flex items-center space-x-1 px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-sm font-medium"
            >
              <X className="h-4 w-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}

      {selectedDemo !== null && (
        <MoveToSceneModal
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          demos={demos}
          sourceDemoIndex={selectedDemo}
          selectedCount={selectedSteps.size}
          onConfirm={handleConfirmMove}
        />
      )}
    </>
  );
};
