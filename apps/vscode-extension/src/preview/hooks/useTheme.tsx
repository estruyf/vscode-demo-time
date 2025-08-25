import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { useState, useEffect } from 'react';
import { WebViewMessages } from '../../constants';
import { usePrevious } from './usePrevious';

export default function useTheme() {
  const [theme, setTheme] = useState('');
  const prevTheme = usePrevious(theme);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [vsCodeTheme, setVsCodeTheme] = useState('');

  const getThemeName = () => {
    return document.body.getAttribute("data-vscode-theme-name") || '';
  };

  const mutationObserver = new MutationObserver((_, __) => {
    setTheme(getThemeName());
  });

  const getVsCodeTheme = () => {
    const themeType = document.body.getAttribute(`data-vscode-theme-kind`);
    setIsDarkTheme(themeType?.includes('dark') || false);

    messageHandler.request<any | null>(WebViewMessages.toVscode.getTheme, getThemeName()).then((theme) => {
      if (theme === null) {
        // Check if light or dark theme
        const themeType = document.body.getAttribute(`data-vscode-theme-kind`);
        if (themeType === 'vscode-light') {
          setVsCodeTheme("github-light");
        } else if (themeType === 'vscode-dark') {
          setVsCodeTheme("github-dark");
        } else if (themeType === 'vscode-high-contrast') {
          setVsCodeTheme("github-dark-high-contrast");
        } else {
          setVsCodeTheme("github-light-high-contrast");
        }
      } else {
        setVsCodeTheme(theme);
      }
    });
  };

  useEffect(() => {
    if (theme !== prevTheme) {
      getVsCodeTheme();
    }
  }, [theme, prevTheme]);

  useEffect(() => {
    mutationObserver.observe(document.body, { childList: false, attributes: true });
    getVsCodeTheme();

    return () => {
      mutationObserver.disconnect();
    };
  }, []);

  return {
    vsCodeTheme,
    isDarkTheme
  };
}