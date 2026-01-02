import React from 'react';
import { Clock, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { TimerStatus } from '@demotime/common';

interface TimerStatusBadgeProps {
  status: TimerStatus;
  actualDuration: number;
  expectedDuration?: number;
  size?: 'small' | 'large';
}

export const TimerStatusBadge: React.FC<TimerStatusBadgeProps> = ({
  status,
  actualDuration,
  expectedDuration,
  size = 'large',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case TimerStatus.OnTime:
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500',
          label: 'On Time',
          description: 'Presentation completed within allocated time',
        };
      case TimerStatus.SlightlyOver:
        return {
          icon: AlertTriangle,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500',
          label: 'Slightly Over',
          description: 'Presentation ran slightly over time (<10%)',
        };
      case TimerStatus.SignificantlyOver:
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500',
          label: 'Over Time',
          description: 'Presentation ran significantly over time',
        };
      case TimerStatus.NoTimer:
        return {
          icon: Clock,
          color: 'text-[var(--vscode-descriptionForeground)]',
          bgColor: 'bg-[var(--vscode-badge-background)]',
          borderColor: 'border-[var(--vscode-panel-border)]',
          label: 'No Timer',
          description: 'No timer was configured for this presentation',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formatDuration = (ms: number) => {
    const minutes = Math.round(ms / 60000);
    return `${minutes}m`;
  };

  const calculateOverage = () => {
    if (!expectedDuration || actualDuration <= expectedDuration) {
      return null;
    }
    const overageMs = actualDuration - expectedDuration;
    const overageMinutes = Math.round(overageMs / 60000);
    return `+${overageMinutes}m`;
  };

  const overage = calculateOverage();

  if (size === 'small') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border ${config.borderColor} ${config.bgColor}`}
        title={config.description}
      >
        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded border ${config.borderColor} ${config.bgColor}`}>
      <Icon className={`w-5 h-5 ${config.color} shrink-0`} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${config.color}`}>{config.label}</span>
          {expectedDuration && (
            <span className="text-xs text-(--vscode-descriptionForeground)">
              {formatDuration(actualDuration)} / {formatDuration(expectedDuration)}
              {overage && <span className={config.color}> ({overage})</span>}
            </span>
          )}
        </div>
        <p className="text-xs text-(--vscode-descriptionForeground) m-0 mt-0.5">
          {config.description}
        </p>
      </div>
    </div>
  );
};
