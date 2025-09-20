import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { DemoConfig } from '@demotime/common';
import { ValidationResult } from '../../utils';

interface ValidationSummaryProps {
  validationResult: ValidationResult;
  config: DemoConfig;
  onNavigateToDemo: (demoIndex: number) => void;
  onNavigateToStep: (demoIndex: number, stepIndex: number) => void;
  className?: string;
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  validationResult,
  config,
  onNavigateToDemo,
  onNavigateToStep,
  className = ''
}) => {
  const { isValid, errors } = validationResult;

  if (isValid) {
    return (
      <div className={`bg-success-50 dark:bg-success-50 border border-success-200 dark:border-success-600 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-success-600" />
          <span className="text-success-800 dark:text-success-200 font-medium">Configuration is valid</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-error-50 dark:bg-error-50 border border-error-200 dark:border-error-600 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-2">
        <AlertCircle className="h-5 w-5 text-error-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h4 className="text-error-800 dark:text-error-200 font-medium mb-2">
            {errors.length} validation error{errors.length !== 1 ? 's' : ''} found
          </h4>
          <div className="space-y-1">
            {errors.map((error, index) => (
              <div key={index} className="text-sm text-error-700 dark:text-error-300">
                {error.demoIndex !== undefined && (
                  <>
                    <button
                      onClick={() => onNavigateToDemo(error.demoIndex!)}
                      className="font-medium text-error-800 dark:text-error-200 hover:text-error-900 dark:hover:text-error-100 hover:underline transition-colors cursor-pointer"
                    >
                      {config.demos[error.demoIndex!]?.title || `Demo ${error.demoIndex! + 1}`}
                    </button>
                    {error.stepIndex !== undefined && (
                      <>
                        <span className="font-medium"> {'>'} </span>
                        <button
                          onClick={() => onNavigateToStep(error.demoIndex!, error.stepIndex!)}
                          className="font-medium text-error-800 dark:text-error-200 hover:text-error-900 dark:hover:text-error-100 hover:underline transition-colors cursor-pointer"
                        >
                          Step {error.stepIndex! + 1}
                        </button>
                      </>
                    )}
                    <span className="font-medium">: </span>
                  </>
                )}
                {error.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
