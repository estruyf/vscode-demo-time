import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { useState, useEffect } from 'react';
import { WebViewMessages } from '../../constants';
import { usePrevious } from './usePrevious';

export default function useTheme(options?: any) {
  const [theme, setTheme] = useState('');
  const prevTheme = usePrevious(theme);
  const [vsCodeTheme, setVsCodeTheme] = useState('');

  const getThemeName = () => {
    return document.body.getAttribute("data-vscode-theme-name") || '';
  };

  const mutationObserver = new MutationObserver((_, __) => {
    setTheme(getThemeName());
  });

  const getVsCodeTheme = () => {

    messageHandler.request<any | null>(WebViewMessages.toVscode.getTheme, getThemeName()).then((theme) => {
      console.log('getVsCodeTheme', theme);
      if (theme === null) {
        // Check if light or dark theme
        const elm = document.body.getAttribute(`data-vscode-theme-kind`);
        if (elm === 'vscode-light') {
          setVsCodeTheme("github-light");
        } else if (elm === 'vscode-dark') {
          setVsCodeTheme("github-dark");
        } else if (elm === 'vscode-high-contrast') {
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
    console.log('Theme changed', theme);
    console.log('prevTheme changed', prevTheme);
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
    vsCodeTheme
  };
}