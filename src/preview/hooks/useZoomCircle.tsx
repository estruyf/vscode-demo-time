import { useState, useCallback, useEffect } from 'react';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { Config, WebViewMessages } from '../../constants';

export const useZoomCircle = (slideRef: React.RefObject<HTMLDivElement>, scale: number) => {
  const [isZoomEnabled, setIsZoomEnabled] = useState(false);
  const [circleWidth, setCircleWidth] = useState(200);

  const fetchZoomCircleSettings = useCallback(async () => {
    try {
      const width = await messageHandler.request<number>(
        WebViewMessages.toVscode.getSetting,
        Config.slides.zoomCircleWidth
      );
      setCircleWidth(width || 200);
    } catch (error) {
      setCircleWidth(200);
    }
  }, []);

  const toggleZoom = useCallback(() => {
    setIsZoomEnabled(prev => !prev);
  }, []);

  useEffect(() => {
    fetchZoomCircleSettings();
  }, [fetchZoomCircleSettings]);

  return {
    isZoomEnabled,
    circleWidth,
    toggleZoom
  };
};