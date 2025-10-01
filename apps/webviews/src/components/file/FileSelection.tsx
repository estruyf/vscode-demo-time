import React from 'react';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';

interface FileSelectionProps {
  selectedFile: string;
  availableFiles: string[];
  onFileSelect: (filename: string) => void;
  currentFilename: string;
  onFilenameChange: (filename: string) => void;
  fileType: 'json' | 'yaml';
}

export const FileSelection: React.FC<FileSelectionProps> = ({
  selectedFile,
  availableFiles,
  onFileSelect,
  currentFilename,
  onFilenameChange,
  fileType
}) => (
  <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
    <div className="w-full sm:w-auto sm:min-w-0 sm:shrink">
      <Select
        value={selectedFile}
        onChange={onFileSelect}
        options={availableFiles.map(file => ({ value: file, label: file }))}
        placeholder="Select demo file..."
        className="text-sm"
      />
    </div>
    <div className="w-full sm:w-auto sm:min-w-0 sm:shrink">
      <Input
        value={currentFilename}
        onChange={onFilenameChange}
        placeholder={`filename.${fileType}`}
        className="text-sm"
      />
    </div>
  </div>
);
