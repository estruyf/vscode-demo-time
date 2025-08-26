import { useCallback } from 'react';
import { DemoConfig } from '../types/demo';
import { validateConfig } from '../utils/validation';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { WebViewMessages } from '@demotime/common';

export const useFileOperations = () => {
  const handleSave = useCallback(async (config: DemoConfig) => {
    // Validate before save
    const validation = validateConfig(config);
    if (!validation.isValid) {
      return false;
    }

    await messageHandler.request(WebViewMessages.toVscode.configEditor.saveFile, { config });
    console.log('Config saved successfully');
    return true;
  }, []);

  return {
    handleSave,
  };
};
