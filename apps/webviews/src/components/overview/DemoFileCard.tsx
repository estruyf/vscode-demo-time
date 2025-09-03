import React from 'react';
import { Play, Settings, Clock, List, User, AlertTriangle } from 'lucide-react';
import { Demo } from '../../types/demo';
import { getActionIcon, getActionColor } from '../../utils/actionHelpers';
import { cn } from '../../utils/cn';
import { Icon } from 'vscrui';

interface DemoFileCardProps {
  demo: Demo;
  globalIndex: number;
  demoIndex: number;
  fileName: string;
  onEdit: () => void;
  onPlay: () => void;
}

export const DemoFileCard: React.FC<DemoFileCardProps> = ({
  demo,
  globalIndex,
  demoIndex,
  fileName,
  onEdit,
  onPlay,
}) => {
  // Calculate estimated duration for this demo
  const estimatedMinutes = Math.ceil(demo.steps.length * 3 / 60);

  // Get unique actions for display
  const uniqueActions = React.useMemo(() => {
    const actions = new Set(demo.steps.map(step => step.action));
    return Array.from(actions).slice(0, 5); // Show max 5 unique actions
  }, [demo.steps]);

  const getStepStatusInfo = () => {
    const enabledSteps = demo.steps.filter(step => !step.disabled);
    const disabledSteps = demo.steps.filter(step => step.disabled);
    
    return {
      total: demo.steps.length,
      enabled: enabledSteps.length,
      disabled: disabledSteps.length,
    };
  };

  const statusInfo = getStepStatusInfo();

  return (
    <div
      className={cn(
        "bg-demo-time-black border border-demo-time-gray-6 rounded-lg p-4 transition-all duration-200 hover:shadow-lg hover:border-demo-time-gray-5",
        demo.disabled && "opacity-60 grayscale"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1 min-w-0">
          {/* Demo Number Badge */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-10 h-10 bg-demo-time-accent rounded-lg text-demo-time-black font-bold text-lg">
              {globalIndex}
            </div>
          </div>

          {/* Demo Content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Demo Title and ID */}
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-lg font-semibold text-demo-time-white truncate" title={demo.title}>
                  {demo.title}
                </h4>
                {demo.disabled && (
                  <span className="px-2 py-1 bg-gray-500 text-white text-xs font-semibold rounded-full">
                    DISABLED
                  </span>
                )}
              </div>
              
              {demo.id && (
                <p className="text-sm text-demo-time-gray-4 font-mono">
                  ID: {demo.id}
                </p>
              )}
              
              {demo.description && (
                <p className="text-sm text-demo-time-gray-4 mt-1 line-clamp-2" title={demo.description}>
                  {demo.description}
                </p>
              )}
            </div>

            {/* Demo Statistics */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center space-x-1 text-demo-time-gray-4">
                <List className="h-4 w-4" />
                <span>{statusInfo.enabled} step{statusInfo.enabled !== 1 ? 's' : ''}</span>
                {statusInfo.disabled > 0 && (
                  <span className="text-yellow-600">
                    (+{statusInfo.disabled} disabled)
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-1 text-demo-time-gray-4">
                <Clock className="h-4 w-4" />
                <span>~{estimatedMinutes}min</span>
              </div>

              {demo.notes?.path && (
                <div className="flex items-center space-x-1 text-demo-time-gray-4">
                  <User className="h-4 w-4" />
                  <span>Has notes</span>
                </div>
              )}
            </div>

            {/* Action Preview */}
            {uniqueActions.length > 0 && (
              <div>
                <p className="text-xs text-demo-time-gray-4 mb-2 font-medium">Actions:</p>
                <div className="flex flex-wrap gap-2">
                  {uniqueActions.map((action) => (
                    <div
                      key={action}
                      className={cn(
                        "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border",
                        getActionColor(action)
                      )}
                      title={action}
                    >
                      <Icon name={getActionIcon(action) as never} className="h-3 w-3" />
                      <span>{action}</span>
                    </div>
                  ))}
                  {demo.steps.length > uniqueActions.length && (
                    <div className="px-2 py-1 bg-demo-time-gray-6 text-demo-time-gray-3 rounded-full text-xs border border-demo-time-gray-5">
                      +{demo.steps.length - uniqueActions.length} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Warnings */}
            {demo.steps.length === 0 && (
              <div className="flex items-center space-x-2 text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">This demo has no steps defined</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex items-start space-x-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Settings}
            onClick={onEdit}
            title="Edit demo configuration"
          />
          
          <Button
            variant="primary"
            size="sm"
            icon={Play}
            onClick={onPlay}
            disabled={demo.disabled || demo.steps.length === 0}
            title={demo.disabled ? "Demo is disabled" : demo.steps.length === 0 ? "No steps to run" : "Run demo"}
          />
        </div>
      </div>

      {/* File Source Info */}
      <div className="mt-3 pt-3 border-t border-demo-time-gray-6">
        <div className="flex items-center justify-between text-xs text-demo-time-gray-4">
          <span className="font-mono truncate" title={fileName}>
            Source: {fileName}
          </span>
          <span>Demo #{demoIndex + 1} in file</span>
        </div>
      </div>
    </div>
  );
};