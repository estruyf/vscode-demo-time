import React from 'react';
import { Button } from '../ui/Button';
import { Eye, LayoutGrid, Plus, Settings } from 'lucide-react';

interface FileActionButtonsProps {
  onSettingsClick: () => void;
  onOverviewClick: () => void;
  onViewSource: () => void;
  onNewFile: () => void;
}

export const FileActionButtons: React.FC<FileActionButtonsProps> = ({ onSettingsClick, onOverviewClick, onViewSource, onNewFile }) => (
  <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
    <Button
      variant="secondary"
      onClick={onSettingsClick}
      icon={Settings}
      className="flex-1"
      size="sm"
      aria-label='Open Demo Time Settings'
      title='Open Demo Time Settings'
    >
    </Button>
    {
      onOverviewClick && (
        <Button
          variant="secondary"
          onClick={onOverviewClick}
          icon={LayoutGrid}
          className="flex-1"
          size="sm"
          aria-label='Open Demo Time Overview'
          title='Open Demo Time Overview'
        >
        </Button>
      )
    }
    <Button
      variant="secondary"
      onClick={onViewSource}
      icon={Eye}
      className="flex-1 sm:flex-none text-xs sm:text-sm"
      size="sm"
    >
      <span className="font-medium hidden sm:inline">View Source</span>
      <span className="font-medium sm:hidden">View</span>
    </Button>
    <Button
      variant="success"
      onClick={onNewFile}
      icon={Plus}
      className="flex-1 sm:flex-none text-xs sm:text-sm"
      size="sm"
    >
      <span className="font-medium hidden lg:inline">New Demo File</span>
      <span className="font-medium lg:hidden">New</span>
    </Button>
  </div>
);
