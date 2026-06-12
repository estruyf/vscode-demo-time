import React from 'react';

interface FileTypeSelectorProps {
  fileType: 'json' | 'yaml';
  onFileTypeChange: (type: 'json' | 'yaml') => void;
}

export const FileTypeSelector: React.FC<FileTypeSelectorProps> = ({ fileType, onFileTypeChange }) => (
  <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
    <button
      onClick={() => onFileTypeChange('json')}
      className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-sm font-medium transition-colors ${fileType === 'json'
        ? 'bg-white text-gray-900 shadow-xs'
        : 'text-gray-600 hover:text-gray-900'
        }`}
    >
      JSON
    </button>
    <button
      onClick={() => onFileTypeChange('yaml')}
      className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-sm font-medium transition-colors ${fileType === 'yaml'
        ? 'bg-white text-gray-900 shadow-xs'
        : 'text-gray-600 hover:text-gray-900'
        }`}
    >
      YAML
    </button>
  </div>
);
