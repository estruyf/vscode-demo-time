import React from 'react';
import { ValidationResult } from '../../utils/validation';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  validation?: ValidationResult;
  showValidation: boolean;
  onToggleValidation: () => void;
  fileControls: React.ReactNode;
  actionControls: React.ReactNode;
  autoSaveStatus?: {
    text: string;
    color: string;
    isActive: boolean;
  };
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  validation,
  onToggleValidation,
  fileControls,
  actionControls,
  autoSaveStatus,
}) => {
  return (
    <div className="bg-demo-time-black shadow-xs border-b border-demo-time-gray-6 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col">
          {/* Title and Controls Row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
            <div className="shrink-0 sm:mr-6">
              <h1 className="text-2xl font-bold text-demo-time-white">
                {title}
              </h1>
              {subtitle && (
                <p className="text-demo-time-gray-4 mt-1 text-sm">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Top Right Controls */}
            <div className="flex items-center justify-end space-x-2 sm:space-x-3 shrink-0">
              {fileControls}
              {actionControls}
            </div>
          </div>

          {/* Validation and Auto-save Row */}
          <div className="flex items-center space-x-6">
            {/* Validation Status */}
            {validation && (
              <button
                onClick={onToggleValidation}
                className="flex items-center space-x-2 pr-3 py-2 rounded-md hover:bg-demo-time-gray-6 transition-colors"
              >
                <div className={`w-3 h-3 rounded-full ${validation.isValid
                  ? 'bg-green-500'
                  : 'bg-red-500'
                  }`} />
                <span className={`text-sm font-medium ${validation.isValid
                  ? 'text-green-600'
                  : 'text-red-600'
                  }`}>
                  {validation.isValid
                    ? 'Valid Configuration'
                    : `${validation.errors.length} error${validation.errors.length !== 1 ? 's' : ''}`
                  }
                </span>
              </button>
            )}

            {/* Auto-save Status */}
            {autoSaveStatus && (
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${autoSaveStatus.isActive ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
                  }`} />
                <span className={`text-xs ${autoSaveStatus.color}`}>
                  {autoSaveStatus.text}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
