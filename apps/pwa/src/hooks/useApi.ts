import { useState, useEffect, useCallback } from 'react';
import { ApiData, ConnectionStatus } from '../types/api';

export const useApi = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(false);

  const connect = useCallback(async (url: string) => {
    setLoading(true);
    setConnectionStatus({ connected: false, url });

    try {
      // Clean up the URL - remove trailing slash and ensure it starts with http/https
      let cleanUrl = url.trim().replace(/\/$/, '');
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `http://${cleanUrl}`;
      }

      const response = await fetch(`${cleanUrl}/api/demos`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiData = await response.json();
      setApiData(data);
      setConnectionStatus({ connected: true, url: cleanUrl });

      // Store the URL in localStorage for future use
      localStorage.setItem('demoTimeApiUrl', cleanUrl);
    } catch (error) {
      console.error('Connection failed:', error);
      setConnectionStatus({
        connected: false,
        url,
        error: error instanceof Error ? error.message : 'Connection failed',
      });
      setApiData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnectionStatus({ connected: false });
    setApiData(null);
    localStorage.removeItem('demoTimeApiUrl');
  }, []);

  const triggerNext = useCallback(
    async (bringToFront = true) => {
      if (!connectionStatus.connected || !connectionStatus.url) {
        throw new Error('Not connected to API');
      }

      const response = await fetch(`${connectionStatus.url}/api/next?bringToFront=${bringToFront}`);
      if (!response.ok) {
        throw new Error(`Failed to trigger next demo: ${response.statusText}`);
      }
    },
    [connectionStatus],
  );

  const triggerPrevious = useCallback(
    async (bringToFront = true) => {
      if (!connectionStatus.connected || !connectionStatus.url) {
        throw new Error('Not connected to API');
      }

      const response = await fetch(
        `${connectionStatus.url}/api/previous?bringToFront=${bringToFront}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to trigger previous demo: ${response.statusText}`);
      }
    },
    [connectionStatus],
  );

  const runById = useCallback(
    async (id: string, bringToFront = true) => {
      if (!connectionStatus.connected || !connectionStatus.url) {
        throw new Error('Not connected to API');
      }

      const url = new URL(`${connectionStatus.url}/api/runById`);
      url.searchParams.set('id', id);
      url.searchParams.set('bringToFront', bringToFront.toString());

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to run demo: ${response.statusText}`);
      }
    },
    [connectionStatus],
  );

  const refreshData = useCallback(
    async (silent = false) => {
      if (!connectionStatus.connected || !connectionStatus.url) {
        return;
      }

      try {
        if (!silent) setLoading(true);
        const response = await fetch(`${connectionStatus.url}/api/demos`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: ApiData = await response.json();
        setApiData(data);
      } catch (error) {
        console.error('Failed to refresh data:', error);
        setConnectionStatus({
          connected: false,
          error: error instanceof Error ? error.message : 'Connection lost',
        });
        setApiData(null);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [connectionStatus],
  );

  // Auto-connect on mount if URL is stored
  useEffect(() => {
    const storedUrl = localStorage.getItem('demoTimeApiUrl');
    if (storedUrl) {
      connect(storedUrl);
    }
  }, [connect]);

  // Polling for updates when connected
  useEffect(() => {
    if (!connectionStatus.connected) return;

    const interval = setInterval(() => {
      refreshData(true);
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [connectionStatus.connected, refreshData]);

  return {
    connectionStatus,
    apiData,
    loading,
    connect,
    disconnect,
    triggerNext,
    triggerPrevious,
    runById,
    refreshData,
  };
};
