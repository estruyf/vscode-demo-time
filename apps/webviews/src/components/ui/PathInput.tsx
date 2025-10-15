import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Folder, File, Eye, Clock } from 'lucide-react';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { WebViewMessages } from '@demotime/common';
import { useRecentFiles } from '../../hooks/useRecentFiles';

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
  const [showRecentFiles, setShowRecentFiles] = useState(false);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { recentFiles, addRecentFile } = useRecentFiles(fileTypes);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowRecentFiles(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (dropdownTimeout) {
        clearTimeout(dropdownTimeout);
      }
    };
  }, [dropdownTimeout]);

  const openFileExplorer = useCallback(() => {
    messageHandler.request<string>(WebViewMessages.toVscode.configEditor.filePicker, { fileTypes }).then((result: string) => {
      if (result) {
        onChange(result);
        addRecentFile(result);
      }
    });
  }, [onChange, fileTypes, addRecentFile]);

  const handleInputFocus = useCallback(() => {
    if (recentFiles.length > 0) {
      setShowRecentFiles(true);
    }
  }, [recentFiles.length]);

  const handleInputBlur = useCallback(() => {
    // Delay hiding the dropdown to allow for clicks on dropdown items
    const timeout = setTimeout(() => {
      setShowRecentFiles(false);
    }, 150);
    setDropdownTimeout(timeout);
  }, []);

  const selectRecentFile = useCallback((filePath: string) => {
    // Clear any pending timeout
    if (dropdownTimeout) {
      clearTimeout(dropdownTimeout);
      setDropdownTimeout(null);
    }
    onChange(filePath);
    addRecentFile(filePath);
    setShowRecentFiles(false);
  }, [onChange, addRecentFile, dropdownTimeout]);

  const openFileEditor = useCallback(() => {
    messageHandler.send(WebViewMessages.toVscode.openFile, value);
  }, [value]);

  const inputClasses = `w-full px-3 py-2 pr-10 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent transition-colors ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'
    } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 ${error ? 'dark:border-red-400 dark:bg-red-900/20' : ''} ${disabled ? 'dark:bg-gray-700' : ''} ${className}`;

  return (
    <div className='w-full'>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}


      <div className='flex items-center w-full gap-2' style={{ height: '42px' }}>
        <div className="relative w-full">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className={inputClasses}
            placeholder={placeholder}
            disabled={disabled}
          />

          {/* Recent files dropdown */}
          {showRecentFiles && recentFiles.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-50 max-h-60 overflow-hidden"
              style={{ zIndex: 1000 }}
            >
              {/* Header */}
              <div className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Recent Files
              </div>

              {/* File list */}
              <div className="max-h-48 overflow-y-auto">
                {recentFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => selectRecentFile(file.path)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-3 group border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    title={file.path}
                  >
                    <File className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {file.fileName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {file.path}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main browse button */}
          <button
            type="button"
            onClick={openFileExplorer}
            disabled={disabled}
            className="absolute right-0 top-0 h-full px-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300 disabled:cursor-not-allowed border-l border-gray-300 dark:border-gray-600"
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
            className={`h-full px-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300 disabled:cursor-not-allowed border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ${disabled || !value ? 'opacity-50' : 'opacity-100'}`}
            style={{ zIndex: 2 }}
            title={`Show source file`}
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
};
