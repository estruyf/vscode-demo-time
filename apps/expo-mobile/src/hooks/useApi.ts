import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiData, ConnectionStatus } from '../types/api';
import { useBringToFront } from '../contexts/BringToFrontContext';

export const useApi = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);
  const { bringToFront } = useBringToFront();
  const latestRequestIdRef = useRef(0);

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

      // Store the URL in AsyncStorage for future use
      await AsyncStorage.setItem('demoTimeApiUrl', cleanUrl);
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

  const disconnect = useCallback(async () => {
    setConnectionStatus({ connected: false });
    setApiData(null);
    setNotes(null);
    await AsyncStorage.removeItem('demoTimeApiUrl');
  }, []);

  const triggerNext = useCallback(async () => {
    if (!connectionStatus.connected || !connectionStatus.url) {
      throw new Error('Not connected to API');
    }

    const response = await fetch(`${connectionStatus.url}/api/next?bringToFront=${bringToFront}`);
    if (!response.ok) {
      throw new Error(`Failed to trigger next demo: ${response.statusText}`);
    }
  }, [connectionStatus, bringToFront]);

  const triggerPrevious = useCallback(async () => {
    if (!connectionStatus.connected || !connectionStatus.url) {
      throw new Error('Not connected to API');
    }

    const response = await fetch(
      `${connectionStatus.url}/api/previous?bringToFront=${bringToFront}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to trigger previous demo: ${response.statusText}`);
    }
  }, [connectionStatus, bringToFront]);

  const runById = useCallback(
    async (id: string) => {
      if (!connectionStatus.connected || !connectionStatus.url) {
        throw new Error('Not connected to API');
      }

      const url = new URL(`${connectionStatus.url}/api/runById`);
      url.searchParams.set('id', id);
      if (bringToFront) {
        url.searchParams.set('bringToFront', 'true');
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to run demo: ${response.statusText}`);
      }
    },
    [connectionStatus, bringToFront],
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

      // Increment request ID to track the latest request
      const requestId = ++latestRequestIdRef.current;

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

        // Only update state if this is still the latest request
        if (requestId === latestRequestIdRef.current) {
          setNotes(notesData);
        }
      } catch (error) {
        console.error('Failed to fetch notes:', error);

        // Only update state if this is still the latest request
        if (requestId === latestRequestIdRef.current) {
          setNotes(null);
        }
      }
    },
    [connectionStatus],
  );

  const clearNotes = useCallback(() => {
    setNotes(null);
  }, []);

  // Auto-connect on mount if URL is stored
  useEffect(() => {
    const loadStoredUrl = async () => {
      const storedUrl = await AsyncStorage.getItem('demoTimeApiUrl');
      if (storedUrl) {
        connect(storedUrl);
      }
    };
    loadStoredUrl();
  }, [connect]);

  // Polling for updates when connected
  useEffect(() => {
    if (!connectionStatus.connected) {
      return;
    }

    const interval = setInterval(() => {
      refreshData(true);
    }, 5000); // Poll every 5 seconds (optimized for mobile battery)

    return () => clearInterval(interval);
  }, [connectionStatus.connected, refreshData]);

  return {
    connectionStatus,
    apiData,
    loading,
    notes,
    bringToFront,
    connect,
    disconnect,
    triggerNext,
    triggerPrevious,
    runById,
    refreshData,
    fetchNotes,
    clearNotes,
  };
};
