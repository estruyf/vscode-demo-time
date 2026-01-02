import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { ErrorSummary, ErrorRecord } from '@demotime/common';
import { formatDuration } from '../../utils';

interface ErrorsSectionProps {
  errorSummary: ErrorSummary;
  errors: ErrorRecord[];
}

export const ErrorsSection: React.FC<ErrorsSectionProps> = ({ errorSummary, errors }) => {
  if (errorSummary.totalErrors === 0) {
    return (
      <div className="flex items-center justify-center h-full text-(--vscode-descriptionForeground)">
        <div className="flex flex-col items-center gap-2">
          <CheckCircle className="w-12 h-12 text-green-500" />
          <p className="text-lg font-medium">No errors encountered</p>
          <p className="text-sm">Your presentation ran smoothly!</p>
        </div>
      </div>
    );
  }

  const errorTypes = Object.entries(errorSummary.byType).sort((a, b) => b[1] - a[1]);

  return (
    <section>
      <div className="mb-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded bg-yellow-500/20 border border-yellow-500/30">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
            {errorSummary.totalErrors} Error{errorSummary.totalErrors !== 1 ? 's' : ''} Encountered
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {errorTypes.map(([type]) => {
          const typeErrors = errors.filter((e) => e.type === type);

          return (
            <div key={type} className="pb-4">
              <div className="flex flex-col gap-2 mt-3 pt-3">
                {typeErrors.map((error, idx) => (
                  <div key={idx} className="p-3 rounded bg-(--vscode-editor-background) border border-yellow-500/20">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xs text-(--vscode-descriptionForeground) font-mono">
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </span>
                      {error.recovered && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-600 dark:text-green-400">
                          Recovered{error.recoveryTime ? ` (${formatDuration(error.recoveryTime)})` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-(--vscode-foreground) m-0 mb-2">{error.message}</p>
                    {error.context && (
                      <p className="text-xs text-(--vscode-descriptionForeground) m-0 font-mono">
                        Context: {error.context}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
