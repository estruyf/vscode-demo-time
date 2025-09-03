import React from 'react';
import { Edit3, FileText } from 'lucide-react';
import { getActionIcon, getActionColor } from '../../utils/actionHelpers';
import { cn } from '../../utils/cn';
import { Icon } from 'vscrui';
import { Step } from '@demotime/common';

interface StepFlowNodeProps {
  step: Step;
  stepIndex: number;
  demoIndex: number;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
}

export const StepFlowNode: React.FC<StepFlowNodeProps> = ({
  step,
  stepIndex,
  isSelected,
  onClick,
  onEdit
}) => {
  const getStepDescription = () => {
    const parts: string[] = [];

    if (step.path) parts.push(step.path);
    if (step.content) parts.push(`"${step.content.substring(0, 50)}${step.content.length > 50 ? '...' : ''}"`);
    if (step.command) parts.push(step.command);
    if (step.url) parts.push(step.url);
    if (step.message) parts.push(step.message);

    return parts.join(' • ');
  };

  const getStepIcon = () => {
    return getActionIcon(step.action);
  };

  return (
    <div
      className={cn(
        "relative bg-white rounded-lg shadow-md border transition-all duration-200 hover:shadow-lg cursor-pointer min-w-72",
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200',
        step.disabled && 'opacity-60 grayscale'
      )}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Step Number */}
            <div className="flex items-center justify-center w-6 h-6 bg-gray-200 rounded-full text-xs font-bold text-gray-700 shrink-0">
              {stepIndex + 1}
            </div>

            <div className="flex-1 min-w-0">
              {/* Action and Icon */}
              <div className="flex items-center space-x-2 mb-2">
                <div className="p-1 rounded-md bg-gray-100">
                  <Icon name={getStepIcon() as never} className="h-3 w-3 text-gray-600" />
                </div>
                <span className="text-sm font-semibold text-gray-900">{step.action}</span>
                <div className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  getActionColor(step.action)
                )}>
                  {step.action.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>

              {/* Step Details */}
              <div className="space-y-1">
                {step.path && (
                  <div className="flex items-center text-xs text-gray-600">
                    <FileText className="h-3 w-3 mr-1" />
                    <span className="truncate font-mono">{step.path}</span>
                  </div>
                )}

                {getStepDescription() && (
                  <p className="text-xs text-gray-600 truncate" title={getStepDescription()}>
                    {getStepDescription()}
                  </p>
                )}

                {/* Special indicators */}
                <div className="flex items-center space-x-2 text-xs">
                  {step.insertTypingMode && step.insertTypingMode !== 'instant' && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                      {step.insertTypingMode}
                    </span>
                  )}
                  {step.timeout && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                      {step.timeout}ms
                    </span>
                  )}
                  {step.disabled && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-semibold">
                      DISABLED
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                title="Edit step"
              >
                <Edit3 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded details when selected */}
        {isSelected && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Step Details</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(step).map(([key, value]) => {
                if (key === 'action' || value === undefined || value === '' || value === false) return null;

                return (
                  <div key={key} className="flex flex-col">
                    <span className="text-gray-500 font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <span className="text-gray-700 font-mono break-all">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
