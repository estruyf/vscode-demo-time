import React from 'react';
import { AlertCircle, AlertTriangle, FilePlus } from 'lucide-react';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { ActProblem, COMMAND, WebViewMessages } from '@demotime/common';
import { cn } from '../../utils/cn';

/**
 * Creates the missing file of a problem in the workspace and opens it
 */
export const createMissingFile = (path: string) => {
  messageHandler.send(WebViewMessages.toVscode.runCommand, {
    command: COMMAND.createMissingFile,
    args: path,
  });
};

interface CreateFileButtonProps {
  path: string;
  /**
   * A small button below a message, or a link inside a line of text
   */
  variant?: 'button' | 'link';
  className?: string;
}

export const CreateFileButton: React.FC<CreateFileButtonProps> = ({
  path,
  variant = 'button',
  className,
}) => (
  <button
    type="button"
    onClick={() => createMissingFile(path)}
    className={cn(
      'inline-flex items-center gap-1.5 font-medium cursor-pointer transition-colors',
      variant === 'button'
        ? 'px-2 py-1 rounded-md border text-xs border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
        : 'underline-offset-2 hover:underline',
      className,
    )}
    title={`Create "${path}" and open it`}
  >
    <FilePlus className="h-3.5 w-3.5" />
    Create file
  </button>
);

interface ProblemBadgeProps {
  problems: ActProblem[];
  className?: string;
}

/**
 * Shows the number of preflight problems, with the messages in the tooltip
 */
export const ProblemBadge: React.FC<ProblemBadgeProps> = ({ problems, className }) => {
  if (problems.length === 0) {
    return null;
  }

  const hasErrors = problems.some((problem) => problem.severity === 'error');
  const Icon = hasErrors ? AlertCircle : AlertTriangle;

  return (
    <span
      className={cn(
        'shrink-0 inline-flex items-center gap-1 text-xs font-semibold tabular-nums',
        hasErrors ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400',
        className,
      )}
      title={problems.map((problem) => problem.message).join('\n')}
      aria-label={`${problems.length} preflight problem${problems.length === 1 ? '' : 's'}`}
    >
      <Icon className="h-4 w-4" />
      {problems.length}
    </span>
  );
};

interface ProblemMessagesProps {
  problems: ActProblem[];
  className?: string;
}

/**
 * Lists the messages of preflight problems, colored by severity
 */
export const ProblemMessages: React.FC<ProblemMessagesProps> = ({ problems, className }) => {
  if (problems.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-1', className)}>
      {problems.map((problem, index) => {
        const isError = problem.severity === 'error';
        const Icon = isError ? AlertCircle : AlertTriangle;

        return (
          <div key={`${index}-${problem.message}`} className="flex items-start gap-1.5 text-sm">
            <Icon
              className={cn(
                'h-4 w-4 mt-0.5 shrink-0',
                isError ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400',
              )}
            />
            <div className="min-w-0">
              <p
                className={
                  isError ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                }
              >
                {problem.message}
              </p>
              {problem.missingFile && (
                <CreateFileButton path={problem.missingFile} className="mt-1.5" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
