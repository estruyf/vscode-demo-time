import React from 'react';
import { Save } from 'lucide-react';
import { Button } from '../ui/Button';

interface ActionControlsProps {
  canSave: boolean;
  onSave: () => void;
  isSaving?: boolean;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  canSave,
  onSave,
  isSaving = false,
}) => {
  return (
    <div className="flex items-center w-full sm:w-auto">
      <Button
        variant="dark"
        onClick={onSave}
        icon={Save}
        disabled={!canSave || isSaving}
        loading={isSaving}
        className="flex-1 sm:flex-none text-xs sm:text-sm"
        size="sm"
      >
        <span className="font-medium">Save</span>
      </Button>
    </div>
  );
};