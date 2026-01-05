import { useCallback } from 'react';
import { validateConfig } from '../utils/validation';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { DemoConfig, WebViewMessages, demoConfigToActConfig } from '@demotime/common';

export const useFileOperations = () => {
  const handleSave = useCallback(async (config: DemoConfig) => {
    // Validate before save
    const validation = validateConfig(config);
    if (!validation.isValid) {
      return false;
    }

    // Convert to ActConfig (version 3) if version is 3, otherwise keep as DemoConfig
    const configToSave = config.version === 3 ? demoConfigToActConfig(config) : config;

    await messageHandler.request(WebViewMessages.toVscode.configEditor.saveFile, {
      config: configToSave,
    });
    console.log('Config saved successfully');
    return true;
  }, []);

  return {
    handleSave,
  };
};
