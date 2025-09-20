import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertTriangle, Clock, ArrowLeft } from 'lucide-react';
import { Demo } from '../../types/demo';
import { validateDemo } from '../../utils/validation';
import { Button } from '../ui/Button';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { WebViewMessages } from '@demotime/common';

interface DemoTestViewProps {
  demo: Demo;
  onBack: () => void;
}

export const DemoTestView: React.FC<DemoTestViewProps> = ({
  demo,
  onBack
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [executedSteps, setExecutedSteps] = useState<number[]>([]);
  const [failedStep, setFailedStep] = useState<number | null>(null);

  const validation = validateDemo(demo);
  const hasErrors = !validation.isValid;

  const simulateDemo = async () => {
    if (hasErrors) {
      return;
    }

    setIsRunning(true);
    setCurrentStep(0);
    setExecutedSteps([]);
    setFailedStep(null);

    for (let i = 0; i < demo.steps.length; i++) {
      setCurrentStep(i);
      const crntStep = demo.steps[i];
      if (crntStep.disabled) {
        setExecutedSteps((prev) => [...prev, i]);
        continue;
      }

      try {
        const result = await messageHandler.request<{ success: boolean; error?: string }>(WebViewMessages.toVscode.configEditor.runDemoStep, {
          step: crntStep,
        });
        if (!result.success) {
          throw new Error(`Step ${i + 1} failed: ${result.error}`);
        }
        setExecutedSteps(prev => [...prev, i]);
      } catch {
        setFailedStep(i);
        setCurrentStep(-1);
        setIsRunning(false);
        return;
      }
    }

    setCurrentStep(-1);
    setIsRunning(false);
  };

  const resetDemo = () => {
    setCurrentStep(-1);
    setExecutedSteps([]);
    setIsRunning(false);
    setFailedStep(null);
  };

  const getStepStatus = (stepIndex: number) => {
    if (failedStep !== null && stepIndex === failedStep) return 'failed';
    if (executedSteps.includes(stepIndex)) return 'completed';
    if (currentStep === stepIndex) return 'running';
    if (currentStep > stepIndex) return 'completed';
    return 'pending';
  };

  const getStepIcon = (status: string) => {
    if (status === 'completed') return CheckCircle;
    if (status === 'running') return Clock;
    if (status === 'failed') return XCircle;
    if (status === 'pending') return Play;
    return Play;
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'running': return 'text-blue-600 animate-pulse';
      case 'failed': return 'text-red-600';
      case 'pending': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            onClick={onBack}
            icon={ArrowLeft}
            size="sm"
          >
            Back to Steps
          </Button>
          <h2 className="text-xl font-semibold text-gray-900">
            Testing: {demo.title}
          </h2>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            onClick={resetDemo}
            disabled={isRunning}
            size="sm"
          >
            Reset
          </Button>
          <Button
            variant="primary"
            onClick={simulateDemo}
            disabled={isRunning || hasErrors}
            icon={Play}
            size="sm"
          >
            {isRunning ? 'Running...' : 'Run Demo'}
          </Button>
        </div>
      </div>

      {/* Demo Info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">{demo.title}</h3>
        {demo.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{demo.description}</p>
        )}
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <span>
            <strong>{demo.steps.length}</strong> steps
          </span>
          {demo.id && (
            <span>
              ID: <strong>{demo.id}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Validation Status */}
      {hasErrors && (
        <div className="bg-error-50 dark:bg-error-50 border border-error-200 dark:border-error-600 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <XCircle className="h-5 w-5 text-error-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-error-800 dark:text-error-200 font-medium mb-2">Demo has validation errors</h4>
              <div className="space-y-1">
                {validation.errors.map((error, index) => (
                  <div key={index} className="text-sm text-error-700 dark:text-error-300">
                    {error.stepIndex !== undefined && (
                      <span className="font-medium">Step {error.stepIndex + 1}: </span>
                    )}
                    {error.message}
                  </div>
                ))}
              </div>
              <p className="text-sm text-error-600 dark:text-error-400 mt-2">
                Fix these errors before running the demo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Status */}
      {!hasErrors && !isRunning && executedSteps.length === demo.steps.length && (
        <div className="bg-success-50 dark:bg-success-50 border border-success-200 dark:border-success-600 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-success-600" />
            <span className="text-success-800 dark:text-success-200 font-medium">Demo completed successfully!</span>
          </div>
        </div>
      )}

      {/* Steps List */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-demo-time-gray-7 mb-4">Demo Steps</h4>
        <div className="space-y-3">
          {demo.steps.map((step, index) => {
            const isDisabled = !!step.disabled;
            const status = getStepStatus(index);
            const StepIcon = getStepIcon(status);
            const stepColor = getStepColor(status);

            return (
              <div
                key={index}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors
                  ${status === 'running' ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800' :
                    status === 'completed' ? 'bg-success-50 dark:bg-success-50 border border-success-200 dark:border-success-600' :
                      'bg-gray-50 dark:bg-demo-time-gray-2 border border-gray-200 dark:border-demo-time-gray-5'}
                  ${isDisabled ? 'opacity-60 grayscale' : ''}
                `}
              >
                <StepIcon className={`h-5 w-5 ${stepColor} shrink-0`} />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-demo-time-gray-7">
                      Step {index + 1}:
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-demo-time-gray-3">
                      {step.action}
                    </span>
                    {isDisabled && (
                      <span className="ml-2 px-2 py-0.5 rounded-xs bg-gray-200 text-xs text-gray-600 font-semibold border border-gray-300">Disabled</span>
                    )}
                  </div>
                  {step.path && (
                    <p className="text-xs text-gray-600 dark:text-demo-time-gray-5 mt-1">{step.path}</p>
                  )}
                </div>
                {status === 'running' && (
                  <div className="shrink-0">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Demo Info */}
      {!hasErrors && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-blue-800 dark:text-blue-300 font-medium mb-1">Demo Simulation</h4>
              <p className="text-sm text-blue-700 dark:text-blue-200">
                This is a simulation that validates your demo configuration.
                Each step will be checked and simulated to ensure it would work properly.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
