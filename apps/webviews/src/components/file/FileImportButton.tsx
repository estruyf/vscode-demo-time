import React from 'react';
import { Button } from '../ui/Button';
import { Upload } from 'lucide-react';

interface FileImportButtonProps {
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FileImportButton: React.FC<FileImportButtonProps> = ({ onImport }) => (
  <div className="flex items-center space-x-3 w-full sm:w-auto">
    <label className="cursor-pointer flex-1 sm:flex-none">
      <input
        type="file"
        accept=".json,.yaml,.yml"
        onChange={onImport}
        className="hidden"
      />
      <Button variant="secondary" icon={Upload} className="w-full">
        <span className="text-sm font-medium">Load</span>
      </Button>
    </label>
  </div>
);
