import { useState, useCallback, useEffect } from 'react';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { Config, WebViewMessages } from '../../constants';

export const useSlideZoom = (slideRef: React.RefObject<HTMLDivElement>, scale: number) => {
  const [isZoomEnabled, setIsZoomEnabled] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(2);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  const fetchZoomSettings = useCallback(async () => {
    try {
      const level = await messageHandler.request<number>(
        WebViewMessages.toVscode.getSetting,
        Config.slides.zoomLevel
      );
      setZoomLevel(level || 2);
    } catch (error) {
      setZoomLevel(2);
    }
  }, []);

  const updatePan = useCallback((mouseX: number, mouseY: number) => {
    if (!isZoomEnabled || !slideRef.current) return;

    const slideRect = slideRef.current.getBoundingClientRect();
    const centerX = slideRect.width / 2;
    const centerY = slideRect.height / 2;

    // Calculate pan based on mouse position relative to center
    // The further from center, the more we pan
    const panFactorX = (mouseX - centerX) / centerX;
    const panFactorY = (mouseY - centerY) / centerY;

    // Limit pan to reasonable bounds
    const maxPan = 50; // Maximum pan distance in percentage
    const newPanX = Math.max(-maxPan, Math.min(maxPan, panFactorX * maxPan));
    const newPanY = Math.max(-maxPan, Math.min(maxPan, panFactorY * maxPan));

    setPanX(newPanX);
    setPanY(newPanY);
  }, [isZoomEnabled, slideRef]);

  const toggleZoom = useCallback(() => {
    setIsZoomEnabled(prev => {
      if (prev) {
        // Reset pan when disabling zoom
        setPanX(0);
        setPanY(0);
      }
      return !prev;
    });
  }, []);

  useEffect(() => {
    fetchZoomSettings();
  }, [fetchZoomSettings]);

  return {
    isZoomEnabled,
    zoomLevel,
    panX,
    panY,
    toggleZoom,
    updatePan
  };
};