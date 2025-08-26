import { useState, useCallback, useEffect } from 'react';
import { DemoConfig, Demo, Step } from '../types/demo';
import { validateConfig } from '../utils/validation';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { WebViewMessages } from '@demotime/common';

// Helper function to merge the initial config with default values.
// This ensures that the config object always has the necessary properties.
const initializeConfig = (initialConfig?: DemoConfig): DemoConfig => {
  const defaultConfig: DemoConfig = {
    title: 'Demo Time Sample',
    description: 'A sample for the Demo Time Config Editor',
    version: 2,
    timer: 30,
    demos: [
      {
        id: 'demo-sample-1',
        title: 'Getting Started',
        steps: [
          { action: 'askCopilotChat' },
          {
            action: 'typeText',
            content: 'Hello, can you tell me more about Demo Time?',
          },
          { action: 'pressEnter' },
        ],
      },
    ],
  };

  if (initialConfig) {
    if (!initialConfig.demos) {
      initialConfig.demos = [];
    }
    return initialConfig;
  }

  // If no initialConfig is provided at all, return the full default config.
  return defaultConfig;
};

export const useDemoConfig = (initialConfig?: DemoConfig) => {
  // Initialize state by merging the initialConfig with defaults.
  const [config, setConfig] = useState<DemoConfig>(() => initializeConfig(initialConfig));

  // Track dirty state
  const [isDirty, setIsDirty] = useState(false);
  const [initialConfigSnapshot, setInitialConfigSnapshot] = useState<string>(() =>
    JSON.stringify(initializeConfig(initialConfig)),
  );

  // This effect synchronizes the component's state when the initialConfig prop changes.
  // This is important for when the config is updated from an external source (e.g., file change).
  // By using the same helper function, we ensure consistent state logic.
  useEffect(() => {
    const newConfig = initializeConfig(initialConfig);
    setConfig(newConfig);
    const newSnapshot = JSON.stringify(newConfig);
    setInitialConfigSnapshot(newSnapshot);
    setIsDirty(false);
  }, [initialConfig]);

  // Effect to track dirty state changes
  useEffect(() => {
    const currentConfigString = JSON.stringify(config);
    const isCurrentlyDirty = currentConfigString !== initialConfigSnapshot;

    if (isCurrentlyDirty !== isDirty) {
      setIsDirty(isCurrentlyDirty);
      // Send dirty state to VS Code
      messageHandler.send(WebViewMessages.toVscode.configEditor.updateConfig, config);
    }
  }, [config, initialConfigSnapshot, isDirty]);

  // Function to mark config as clean (after successful save)
  const markConfigAsClean = useCallback(() => {
    const currentConfigString = JSON.stringify(config);
    setInitialConfigSnapshot(currentConfigString);
    setIsDirty(false);
  }, [config]);

  const handleConfigChange = useCallback((updates: Partial<DemoConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleDemoChange = useCallback((index: number, demo: Demo) => {
    setConfig((prev) => ({
      ...prev,
      demos: prev.demos.map((d, i) => (i === index ? demo : d)),
    }));
  }, []);

  const handleStepChange = useCallback((demoIndex: number, stepIndex: number, step: Step) => {
    setConfig((prev) => ({
      ...prev,
      demos: prev.demos.map((demo, dIdx) =>
        dIdx === demoIndex
          ? {
              ...demo,
              steps: demo.steps.map((s, sIdx) => (sIdx === stepIndex ? step : s)),
            }
          : demo,
      ),
    }));
  }, []);

  const handleAddDemo = useCallback(() => {
    // Generate a unique demo ID
    const generateDemoId = () => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 4);
      return `demo-${timestamp}-${random}`;
    };

    const newDemo: Demo = {
      id: generateDemoId(),
      title: `Demo ${config.demos.length + 1}`,
      steps: [],
    };

    setConfig((prev) => ({
      ...prev,
      demos: [...prev.demos, newDemo],
    }));
  }, [config.demos]);

  const handleRemoveDemo = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      demos: prev.demos.filter((_, i) => i !== index),
    }));
  }, []);

  const handleAddStep = useCallback((demoIndex: number) => {
    const newStep: Step = { action: 'create' };
    setConfig((prev) => ({
      ...prev,
      demos: prev.demos.map((demo, idx) =>
        idx === demoIndex ? { ...demo, steps: [...demo.steps, newStep] } : demo,
      ),
    }));
  }, []);

  const handleRemoveStep = useCallback((demoIndex: number, stepIndex: number) => {
    setConfig((prev) => ({
      ...prev,
      demos: prev.demos.map((demo, dIdx) =>
        dIdx === demoIndex
          ? {
              ...demo,
              steps: demo.steps.filter((_, sIdx) => sIdx !== stepIndex),
            }
          : demo,
      ),
    }));
  }, []);

  const handleDuplicateDemo = useCallback(
    (index: number) => {
      const demoToDuplicate = config.demos[index];

      // Generate a unique demo ID
      const generateDemoId = () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 4);
        return `demo-${timestamp}-${random}`;
      };

      const duplicatedDemo: Demo = {
        ...demoToDuplicate,
        id: generateDemoId(),
        title: `${demoToDuplicate.title} (Copy)`,
        steps: [...demoToDuplicate.steps], // Deep copy the steps array
      };

      setConfig((prev) => ({
        ...prev,
        demos: [...prev.demos.slice(0, index + 1), duplicatedDemo, ...prev.demos.slice(index + 1)],
      }));
    },
    [config.demos],
  );

  const handleDuplicateStep = useCallback((demoIndex: number, stepIndex: number) => {
    setConfig((prev) => {
      const newDemos = prev.demos.map((demo, dIdx) => {
        if (dIdx === demoIndex) {
          const newSteps = [...demo.steps];
          const stepToDuplicate = newSteps[stepIndex];
          // Insert the duplicated step right after the original
          newSteps.splice(stepIndex + 1, 0, { ...stepToDuplicate });
          return { ...demo, steps: newSteps };
        }
        return demo;
      });
      return { ...prev, demos: newDemos };
    });
  }, []);

  const handleReorderDemo = useCallback((fromIndex: number, toIndex: number) => {
    setConfig((prev) => {
      const newDemos = [...prev.demos];
      const [draggedItem] = newDemos.splice(fromIndex, 1);
      if (draggedItem === undefined) return prev;
      newDemos.splice(toIndex, 0, draggedItem);
      return { ...prev, demos: newDemos };
    });
  }, []);

  const handleReorderStep = useCallback((demoIndex: number, fromIndex: number, toIndex: number) => {
    setConfig((prev) => {
      const newDemos = [...prev.demos];
      const demoToUpdate = newDemos[demoIndex];

      if (!demoToUpdate) {
        return prev;
      }

      const newSteps = [...demoToUpdate.steps];
      const [draggedItem] = newSteps.splice(fromIndex, 1);

      // If the item is undefined (which causes the crash), abort the update.
      if (draggedItem === undefined) {
        console.error(`Drag-and-drop failed: Could not retrieve item from index ${fromIndex}.`);
        return prev;
      }

      newSteps.splice(toIndex, 0, draggedItem);

      newDemos[demoIndex] = { ...demoToUpdate, steps: newSteps };

      return { ...prev, demos: newDemos };
    });
  }, []);

  const validation = validateConfig(config);

  return {
    config,
    setConfig,
    isDirty,
    markConfigAsClean,
    handleConfigChange,
    handleDemoChange,
    handleStepChange,
    handleAddDemo,
    handleRemoveDemo,
    handleAddStep,
    handleRemoveStep,
    handleReorderDemo,
    handleReorderStep,
    handleDuplicateDemo,
    handleDuplicateStep,
    validation,
  };
};
