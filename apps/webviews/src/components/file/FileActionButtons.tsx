import React from 'react';
import { Button } from '../ui/Button';
import { Clapperboard, Eye, LayoutGrid, Settings } from 'lucide-react';

interface FileActionButtonsProps {
  onSettingsClick: () => void;
  onOverviewClick: () => void;
  onViewSource: () => void;
  onNewFile: () => void;
}

export const FileActionButtons: React.FC<FileActionButtonsProps> = ({ onSettingsClick, onOverviewClick, onViewSource, onNewFile }) => (
  <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-100 p-0 dark:border-gray-700 dark:bg-gray-800">
      <Button
        variant="outline"
        onClick={onSettingsClick}
        icon={Settings}
        className="h-10 w-10"
        size="xs"
        title="Open Demo Time Settings"
      />

      {onOverviewClick && (
        <Button
          variant="outline"
          onClick={onOverviewClick}
          icon={LayoutGrid}
          className="h-10 w-10"
          size="xs"
          title="Open Demo Time Overview"
        />
      )}

      <Button
        variant="outline"
        onClick={onViewSource}
        icon={Eye}
        className="h-10 w-10"
        size="xs"
        title="View Source"
      />
    </div>

    <Button
      variant="secondary"
      onClick={onNewFile}
      icon={Clapperboard}
      className="h-10 px-5 text-sm text-gray-800"
      size="sm"
    >
      <span className="font-semibold">New act</span>
    </Button>
  </div>
);
