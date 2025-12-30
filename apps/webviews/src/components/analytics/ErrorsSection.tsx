import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ErrorSummary } from '@demotime/common';
import { formatDuration } from '../../utils';

interface ErrorsSectionProps {
  errorSummary: ErrorSummary;
}

export const ErrorsSection: React.FC<ErrorsSectionProps> = ({ errorSummary }) => {
  if (errorSummary.totalErrors === 0) return null;

  return (
    <section>
      <h3 className="m-0 mb-3 text-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        Errors
      </h3>
      <div className="flex gap-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl font-bold">{errorSummary.totalErrors}</span>
          <span className="text-sm text-[var(--vscode-descriptionForeground)]">Total Errors</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl font-bold">{errorSummary.recoveredErrors}</span>
          <span className="text-sm text-[var(--vscode-descriptionForeground)]">Recovered</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl font-bold">{formatDuration(errorSummary.totalRecoveryTime)}</span>
          <span className="text-sm text-[var(--vscode-descriptionForeground)]">Recovery Time</span>
        </div>
      </div>
    </section>
  );
};
