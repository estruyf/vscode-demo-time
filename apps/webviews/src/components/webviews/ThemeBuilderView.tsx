import * as React from 'react';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { WebViewMessages } from '@demotime/common';
import { App as ThemeBuilderApp } from '@demotime/theme-builder';
import type { ExportResult } from '@demotime/theme-builder';
import '../../styles/themeBuilder.css';

interface ExportThemeResponse {
  success: boolean;
  path?: string;
  message?: string;
}

const exportTheme = async (
  filename: string,
  css: string,
  setAsDefault: boolean,
): Promise<ExportResult> => {
  try {
    const result = await messageHandler.request<ExportThemeResponse>(
      WebViewMessages.toVscode.themeBuilder.exportTheme,
      { filename, css, setAsDefault },
    );

    if (!result?.success) {
      return { success: false, message: result?.message || 'Could not save the theme.' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
};

const ThemeBuilderView: React.FC = () => {
  return (
    <div className="theme-builder-root">
      <ThemeBuilderApp onExportTheme={exportTheme} />
    </div>
  );
};

export default ThemeBuilderView;
