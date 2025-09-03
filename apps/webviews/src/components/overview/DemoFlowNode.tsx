import React from 'react';
import { Play, Edit3, ChevronRight, ChevronDown } from 'lucide-react';
import { Demo } from '../../types/demo';
import { getActionIcon } from '../../utils/actionHelpers';
import { cn } from '../../utils/cn';

interface DemoFlowNodeProps {
  demo: Demo;
  demoIndex: number;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onPlay: () => void;
}

export const DemoFlowNode: React.FC<DemoFlowNodeProps> = ({
  demo,
  demoIndex,
  isSelected,
  onClick,
  onEdit,
  onPlay
}) => {
  return (
    <div className="flex items-start mb-4">
      {/* Demo Node */}
      <div className={cn(
        "relative min-w-80 bg-white rounded-xl shadow-lg border-2 transition-all duration-200 hover:shadow-xl",
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-demo-time-gray-5',
        demo.disabled && 'opacity-60 grayscale'
      )}>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-3">
                <div className="flex items-center justify-center w-8 h-8 bg-demo-time-accent rounded-lg text-demo-time-black font-bold text-sm">
                  {demoIndex + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate" title={demo.title}>
                    {demo.title}
                  </h3>
                  {demo.id && (
                    <p className="text-sm text-gray-500 font-mono">ID: {demo.id}</p>
                  )}
                </div>
                <button
                  onClick={onClick}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title={isSelected ? 'Collapse steps' : 'Expand steps'}
                >
                  {isSelected ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>

              {demo.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {demo.description}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{demo.steps.length} step{demo.steps.length !== 1 ? 's' : ''}</span>
                  {demo.steps.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <span>Actions:</span>
                      <div className="flex space-x-1">
                        {demo.steps.slice(0, 3).map((step, idx) => (
                          <div
                            key={idx}
                            className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center"
                            title={step.action}
                          >
                            <span className="text-xs">{getActionIcon(step.action)}</span>
                          </div>
                        ))}
                        {demo.steps.length > 3 && (
                          <div className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center">
                            <span className="text-xs">+{demo.steps.length - 3}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit demo"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlay();
                    }}
                    disabled={demo.disabled}
                    className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Run demo"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {demo.disabled && (
                <div className="mt-3 px-3 py-1 bg-gray-100 border border-gray-300 rounded-md">
                  <span className="text-xs font-semibold text-gray-600">DISABLED</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
