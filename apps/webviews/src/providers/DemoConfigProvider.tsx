import React, { createContext, ReactNode } from 'react';
import { DemoConfig } from '@demotime/common';
import { useDemoConfig } from '../hooks';

interface ValidationError {
  field: string;
  message: string;
  demoIndex?: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface DemoConfigContextType {
  config: DemoConfig;
  setConfig: React.Dispatch<React.SetStateAction<DemoConfig>>;
  isDirty: boolean;
  markConfigAsClean: () => void;
  handleConfigChange: (updates: Partial<DemoConfig>) => void;
  handleDemoChange: (demoIndex: number, demo: DemoConfig['demos'][0]) => void;
  handleStepChange: (demoIndex: number, stepIndex: number, step: DemoConfig['demos'][0]['steps'][0]) => void;
  handleAddDemo: () => void;
  handleRemoveDemo: (index: number) => void;
  handleDuplicateDemo: (index: number) => void;
  handleAddStep: (demoIndex: number) => void;
  handleRemoveStep: (demoIndex: number, stepIndex: number) => void;
  handleDuplicateStep: (demoIndex: number, stepIndex: number) => void;
  handleReorderDemo: (fromIndex: number, toIndex: number) => void;
  handleReorderStep: (demoIndex: number, fromIndex: number, toIndex: number) => void;
  validation: ValidationResult;
}

const DemoConfigContext = createContext<DemoConfigContextType | undefined>(undefined);

export { DemoConfigContext };

interface DemoConfigProviderProps {
  children: ReactNode;
  initialConfig: DemoConfig;
}

export const DemoConfigProvider: React.FC<DemoConfigProviderProps> = ({ children, initialConfig }) => {
  const demoConfigHook = useDemoConfig(initialConfig);

  return (
    <DemoConfigContext.Provider value={demoConfigHook}>
      {children}
    </DemoConfigContext.Provider>
  );
};
