import { useState, useEffect, useCallback } from 'react';
import { ApiData, ConnectionStatus } from '../types/api';

export const useApi = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);

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
    setNotes(null);
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

      refreshData(true);
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

      refreshData(true);
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
        if (!silent) {
          setLoading(true);
        }
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
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [connectionStatus],
  );

  const fetchNotes = useCallback(
    async (notesPath: string) => {
      if (!connectionStatus.connected || !connectionStatus.url) {
        return;
      }

      try {
        const response = await fetch(`${connectionStatus.url}/api/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: notesPath }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch notes: ${response.statusText}`);
        }

        const notesData = await response.text();
        setNotes(notesData);
      } catch (error) {
        console.error('Failed to fetch notes:', error);
        setNotes(null);
      }
    },
    [connectionStatus],
  );

  const fetchScreenshot = useCallback(async () => {
    if (!connectionStatus.connected || !connectionStatus.url) {
      return;
    }

    try {
      const response = await fetch(`${connectionStatus.url}/api/screenshot`);
      if (!response.ok) {
        throw new Error(`Failed to fetch screenshot: ${response.statusText}`);
      }

      const base64Img = await response.text();
      return base64Img;
    } catch (error) {
      console.error('Failed to fetch screenshot:', error);
      return null;
    }
  }, [connectionStatus]);

  const zoomIn = useCallback(
    async (bringToFront = true) => {
      if (!connectionStatus.connected || !connectionStatus.url) {
        throw new Error('Not connected to API');
      }

      const response = await fetch(
        `${connectionStatus.url}/api/zoom-in?bringToFront=${bringToFront}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to zoom in: ${response.statusText}`);
      }
    },
    [connectionStatus],
  );

  const zoomOut = useCallback(
    async (bringToFront = true) => {
      if (!connectionStatus.connected || !connectionStatus.url) {
        throw new Error('Not connected to API');
      }

      const response = await fetch(
        `${connectionStatus.url}/api/zoom-out?bringToFront=${bringToFront}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to zoom out: ${response.statusText}`);
      }
    },
    [connectionStatus],
  );

  const clearNotes = useCallback(() => {
    setNotes(null);
  }, []);

  // Auto-connect on mount if URL is stored
  useEffect(() => {
    const storedUrl = localStorage.getItem('demoTimeApiUrl');
    if (storedUrl) {
      connect(storedUrl);
    }
  }, [connect]);

  // Polling for updates when connected
  useEffect(() => {
    if (!connectionStatus.connected) {
      return;
    }

    const interval = setInterval(() => {
      refreshData(true);
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [connectionStatus.connected, refreshData]);

  return {
    connectionStatus,
    apiData,
    loading,
    notes,
    connect,
    disconnect,
    triggerNext,
    triggerPrevious,
    runById,
    refreshData,
    fetchNotes,
    clearNotes,
    fetchScreenshot,
    zoomIn,
    zoomOut,
  };
};
