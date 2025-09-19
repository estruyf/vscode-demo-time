import React, { useCallback } from 'react';
import { Folder, File, Eye } from 'lucide-react';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { WebViewMessages } from '@demotime/common';

interface PathInputProps {
  label?: string;
  required?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: 'file' | 'folder';
  fileTypes?: string[];
  showOpenButton?: boolean;
}

export const PathInput: React.FC<PathInputProps> = ({
  label,
  required = false,
  error,
  className = '',
  placeholder,
  value,
  onChange,
  disabled = false,
  type = 'file',
  fileTypes = [],
  showOpenButton = true,
}) => {
  const openFileExplorer = useCallback(() => {
    messageHandler.request<string>(WebViewMessages.toVscode.configEditor.filePicker, { fileTypes }).then((result: string) => {
      onChange(result);
    });
  }, [onChange, fileTypes]);

  const openFileEditor = useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.openFile, value);
  }, [value]);

  const inputClasses = `w-full px-3 py-2 pr-10 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'
    } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`;

  return (
    <div className='w-full'>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}


      <div className='flex items-center w-full gap-2' style={{ height: '42px' }}>
        <div className="relative w-full">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClasses}
            placeholder={placeholder}
            disabled={disabled}
          />

          {/* Main browse button */}
          <button
            type="button"
            onClick={openFileExplorer}
            disabled={disabled}
            className="absolute right-0 top-0 h-full px-3 flex items-center text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed border-l border-gray-300"
            title={`Browse for ${type}`}
          >
            {type === 'folder' ? (
              <Folder className="h-4 w-4" />
            ) : (
              <File className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Open in editor button (only if value and showOpenButton) */}
        {showOpenButton && (
          <button
            type="button"
            onClick={openFileEditor}
            disabled={disabled || !value}
            className={`h-full px-2 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed border rounded-md border-gray-300 ${disabled || !value ? 'opacity-50' : 'opacity-100'}`}
            style={{ zIndex: 2 }}
            title={`Show source file`}
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
      </div>



      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
};