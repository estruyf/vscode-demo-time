import React from 'react';
import { List, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { DemoBreakdownItem } from '@demotime/common';
import { formatDuration } from '../../utils';

interface DemoBreakdownProps {
  demos: DemoBreakdownItem[];
}

export const DemoBreakdown: React.FC<DemoBreakdownProps> = ({ demos }) => {
  const [expandedErrors, setExpandedErrors] = React.useState<Set<number>>(new Set());

  const toggleErrors = (idx: number) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };
  return (
    <section>
      <div className="flex flex-col gap-3">
        {demos.map((demo, idx) => (
          <Card
            key={idx}
            className="p-4 transition-all hover:shadow-lg hover:border-(--vscode-focusBorder)"
          >
            {/* Header with title and error indicator */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <div className="font-semibold text-base mb-1 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-(--vscode-badge-background) text-(--vscode-badge-foreground) text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span>{demo.sceneTitle}</span>
                </div>
              </div>
              {demo.hadErrors && (
                <>
                  {demo.errors && demo.errors.length > 0 ? (
                    <button
                      onClick={() => toggleErrors(idx)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 transition-colors cursor-pointer border-none"
                      title="Click to view errors"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-medium">{demo.errors.length} Error{demo.errors.length !== 1 ? 's' : ''}</span>
                      {expandedErrors.has(idx) ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-700 text-white">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-medium">Errors</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-(--vscode-descriptionForeground) uppercase tracking-wide">Duration</span>
                <span className="font-semibold text-sm">{formatDuration(demo.duration)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-(--vscode-descriptionForeground) uppercase tracking-wide">Moves</span>
                <span className="font-semibold text-sm">{demo.moveCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-(--vscode-descriptionForeground) uppercase tracking-wide">Share</span>
                <span className="font-semibold text-sm">{demo.percentage.toFixed(1)}%</span>
              </div>
              {demo.moveCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-(--vscode-descriptionForeground) uppercase tracking-wide">Avg/Move</span>
                  <span className="font-semibold text-sm">{formatDuration(demo.avgMoveDuration)}</span>
                </div>
              )}
            </div>

            {/* Error list */}
            {expandedErrors.has(idx) && demo.errors && demo.errors.length > 0 && (
              <div className="mb-3 p-3 rounded bg-yellow-500/10 border border-yellow-500/30">
                <div className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-2 uppercase tracking-wide">
                  Error Details
                </div>
                <div className="flex flex-col gap-2">
                  {demo.errors.map((error, errorIdx) => (
                    <div key={errorIdx} className="p-2 rounded bg-(--vscode-editor-background) border border-yellow-500/20">
                      <div className="flex items-start gap-2 mb-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                          {error.type}
                        </span>
                        {error.recovered && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-600 dark:text-green-400">
                            Recovered{error.recoveryTime ? ` (${formatDuration(error.recoveryTime)})` : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-(--vscode-foreground) m-0 mb-1">{error.message}</p>
                      {error.context && (
                        <p className="text-xs text-(--vscode-descriptionForeground) m-0 font-mono">
                          Context: {error.context}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress bar */}
            <div className="relative h-1.5 bg-(--vscode-editor-background) rounded-full overflow-hidden mb-3">
              <div
                className="absolute inset-y-0 left-0 bg-(--vscode-progressBar-background) rounded-full transition-all"
                style={{ width: `${Math.min(demo.percentage, 100)}%` }}
              />
            </div>

            {/* Action details */}
            {demo.actionDetails && demo.actionDetails.length > 0 && (
              <div className="mt-3 pt-3 border-t border-(--vscode-panel-border)">
                <div className="text-xs font-semibold text-(--vscode-descriptionForeground) mb-2 uppercase tracking-wide">
                  Action Timeline
                </div>
                <div className="flex flex-col gap-1.5">
                  {demo.actionDetails.map((action, actionIdx) => (
                    <div
                      key={actionIdx}
                      className="flex items-center justify-between gap-3 p-2 rounded bg-(--vscode-editor-background)/50 hover:bg-(--vscode-list-hoverBackground) transition-colors"
                    >
                      <span className="text-xs flex-1 font-medium">
                        {action.type === 'slide' && action.slideTitle
                          ? `Slide ${(action.slideIdx ?? 0) + 1}: ${action.slideTitle}`
                          : `${action.type.charAt(0).toUpperCase() + action.type.slice(1)}${action.slideIdx !== undefined ? ` ${action.slideIdx + 1}` : ''}`}
                      </span>
                      <span className="text-xs font-mono text-(--vscode-descriptionForeground) font-semibold">
                        {formatDuration(action.duration)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
};
