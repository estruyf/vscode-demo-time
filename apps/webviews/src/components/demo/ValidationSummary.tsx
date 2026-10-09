import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { ActProblem, DemoConfig } from '@demotime/common';
import { ValidationResult } from '../../utils';
import { CreateFileButton } from '../ui/ProblemBadge';

interface ValidationSummaryProps {
  validationResult: ValidationResult;
  /**
   * The preflight problems, listed with the validation errors
   */
  preflightProblems?: ActProblem[];
  config: DemoConfig;
  onNavigateToDemo: (demoIndex: number) => void;
  onNavigateToStep: (demoIndex: number, stepIndex: number) => void;
  className?: string;
}

interface SummaryItem {
  severity: 'error' | 'warning';
  message: string;
  demoIndex?: number;
  stepIndex?: number;
  missingFile?: string;
}

const STYLES = {
  error: {
    item: 'text-red-700 dark:text-red-300',
    link: 'text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100',
  },
  warning: {
    item: 'text-amber-700 dark:text-amber-300',
    link: 'text-amber-800 dark:text-amber-200 hover:text-amber-900 dark:hover:text-amber-100',
  },
};

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  validationResult,
  preflightProblems = [],
  config,
  onNavigateToDemo,
  onNavigateToStep,
  className = ''
}) => {
  const items: SummaryItem[] = [
    ...validationResult.errors.map((error): SummaryItem => ({
      severity: 'error',
      message: error.message,
      demoIndex: error.demoIndex,
      stepIndex: error.stepIndex,
    })),
    ...preflightProblems.map((problem): SummaryItem => ({
      severity: problem.severity,
      message: problem.message,
      demoIndex: problem.sceneIndex,
      stepIndex: problem.moveIndex,
      missingFile: problem.missingFile,
    })),
  ].sort(
    (a, b) =>
      (a.demoIndex ?? -1) - (b.demoIndex ?? -1) || (a.stepIndex ?? -1) - (b.stepIndex ?? -1)
  );

  if (items.length === 0) {
    return (
      <div className={`bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800 dark:text-green-200 font-medium">Configuration is valid</span>
        </div>
      </div>
    );
  }

  const errors = items.filter((item) => item.severity === 'error').length;
  const warnings = items.length - errors;
  const found = [
    errors ? `${errors} error${errors !== 1 ? 's' : ''}` : '',
    warnings ? `${warnings} warning${warnings !== 1 ? 's' : ''}` : '',
  ]
    .filter(Boolean)
    .join(' and ');
  const Icon = errors ? AlertCircle : AlertTriangle;

  return (
    <div
      className={`${errors
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
        } border rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start space-x-2">
        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${errors ? 'text-red-600' : 'text-amber-600'}`} />
        <div className="flex-1">
          <h4 className={`font-medium mb-2 ${errors ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'}`}>
            {found} found
          </h4>
          <div className="space-y-1">
            {items.map((item, index) => {
              const styles = STYLES[item.severity];
              const linkClassName = `font-medium hover:underline transition-colors cursor-pointer ${styles.link}`;

              return (
                <div key={index} className={`text-sm ${styles.item}`}>
                  {item.demoIndex !== undefined && (
                    <>
                      <button onClick={() => onNavigateToDemo(item.demoIndex!)} className={linkClassName}>
                        {config.demos[item.demoIndex]?.title || `Scene ${item.demoIndex + 1}`}
                      </button>
                      {item.stepIndex !== undefined && (
                        <>
                          <span className="font-medium"> {'>'} </span>
                          <button
                            onClick={() => onNavigateToStep(item.demoIndex!, item.stepIndex!)}
                            className={linkClassName}
                          >
                            Move {item.stepIndex + 1}
                          </button>
                        </>
                      )}
                      <span className="font-medium">: </span>
                    </>
                  )}
                  {item.message}
                  {item.missingFile && (
                    <CreateFileButton
                      path={item.missingFile}
                      variant="link"
                      className={`ml-2 align-middle ${styles.link}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
