import React, { createContext, useContext, ReactNode } from 'react';

interface WebviewSettingsContextProps {
  webviewUrl: string;
}

const WebviewSettingsContext = createContext<WebviewSettingsContextProps | undefined>(undefined);

interface WebviewSettingsProviderProps {
  webviewUrl: string;
  children: ReactNode;
}

export const WebviewSettingsProvider: React.FC<WebviewSettingsProviderProps> = ({ webviewUrl, children }) => {
  return (
    <WebviewSettingsContext.Provider value={{ webviewUrl }}>
      {children}
    </WebviewSettingsContext.Provider>
  );
};

export function useWebviewSettings() {
  const context = useContext(WebviewSettingsContext);
  if (!context) {
    throw new Error('useWebviewSettings must be used within a WebviewSettingsProvider');
  }
  return context;
}
