import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { ValidationResult } from '../utils/validation';
import { DemoConfig } from '../types/demo';

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
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800 font-medium">Configuration is valid</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-2">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h4 className="text-red-800 font-medium mb-2">
            {errors.length} validation error{errors.length !== 1 ? 's' : ''} found
          </h4>
          <div className="space-y-1">
            {errors.map((error, index) => (
              <div key={index} className="text-sm text-red-700">
                {error.demoIndex !== undefined && (
                  <>
                    <button
                      onClick={() => onNavigateToDemo(error.demoIndex!)}
                      className="font-medium text-red-800 hover:text-red-900 hover:underline transition-colors cursor-pointer"
                    >
                      {config.demos[error.demoIndex!]?.title || `Demo ${error.demoIndex! + 1}`}
                    </button>
                    {error.stepIndex !== undefined && (
                      <>
                        <span className="font-medium"> {'>'} </span>
                        <button
                          onClick={() => onNavigateToStep(error.demoIndex!, error.stepIndex!)}
                          className="font-medium text-red-800 hover:text-red-900 hover:underline transition-colors cursor-pointer"
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