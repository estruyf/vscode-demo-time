import React from 'react';
import { MoveRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Demo } from '@demotime/common';

export type MoveToSceneTarget =
  | { type: 'existing'; demoIndex: number }
  | { type: 'new'; title?: string; id?: string };

interface MoveToSceneModalProps {
  isOpen: boolean;
  onClose: () => void;
  demos: Demo[];
  sourceDemoIndex: number;
  selectedCount: number;
  onConfirm: (target: MoveToSceneTarget) => void;
}

export const MoveToSceneModal: React.FC<MoveToSceneModalProps> = ({
  isOpen,
  onClose,
  demos,
  sourceDemoIndex,
  selectedCount,
  onConfirm,
}) => {
  // Scenes that can receive the moves (every scene except the source one).
  const targetScenes = React.useMemo(
    () =>
      demos
        .map((demo, index) => ({ demo, index }))
        .filter(({ index }) => index !== sourceDemoIndex),
    [demos, sourceDemoIndex],
  );

  const hasExistingTargets = targetScenes.length > 0;

  const [mode, setMode] = React.useState<'existing' | 'new'>(hasExistingTargets ? 'existing' : 'new');
  const [targetIndex, setTargetIndex] = React.useState<number>(targetScenes[0]?.index ?? -1);
  const [newTitle, setNewTitle] = React.useState('');
  const [newId, setNewId] = React.useState('');

  // Reset the internal state every time the modal is (re)opened.
  React.useEffect(() => {
    if (isOpen) {
      setMode(hasExistingTargets ? 'existing' : 'new');
      setTargetIndex(targetScenes[0]?.index ?? -1);
      setNewTitle('');
      setNewId('');
    }
  }, [isOpen, hasExistingTargets, targetScenes]);

  const canConfirm = mode === 'new' ? true : targetIndex >= 0;
  const moveLabel = `Move ${selectedCount} move${selectedCount !== 1 ? 's' : ''}`;

  const handleConfirm = () => {
    if (mode === 'existing') {
      if (targetIndex < 0) {
        return;
      }
      onConfirm({ type: 'existing', demoIndex: targetIndex });
    } else {
      onConfirm({ type: 'new', title: newTitle, id: newId });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Move to scene"
      size="md"
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!canConfirm} icon={MoveRight} iconPosition="right">
            {moveLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Move the selected move{selectedCount !== 1 ? 's' : ''} to another scene. The original order is preserved.
        </p>

        <div className="space-y-3">
          {hasExistingTargets && (
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="move-target-mode"
                checked={mode === 'existing'}
                onChange={() => setMode('existing')}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Existing scene</span>
                <div className="mt-2">
                  <Select
                    value={targetIndex >= 0 ? String(targetIndex) : ''}
                    onChange={(value) => setTargetIndex(Number(value))}
                    disabled={mode !== 'existing'}
                    options={targetScenes.map(({ demo, index }) => ({
                      value: String(index),
                      label: demo.title || `Scene ${index + 1}`,
                    }))}
                  />
                </div>
              </div>
            </label>
          )}

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="radio"
              name="move-target-mode"
              checked={mode === 'new'}
              onChange={() => setMode('new')}
              className="mt-1 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-900 dark:text-white">New scene</span>
              <div className="mt-2 space-y-3">
                <Input
                  label="Title"
                  value={newTitle}
                  onChange={setNewTitle}
                  placeholder={`Scene ${demos.length + 1}`}
                  disabled={mode !== 'new'}
                />
                <Input
                  label="ID (optional)"
                  value={newId}
                  onChange={setNewId}
                  placeholder="Auto-generated when left empty"
                  disabled={mode !== 'new'}
                />
              </div>
            </div>
          </label>
        </div>
      </div>
    </Modal>
  );
};
