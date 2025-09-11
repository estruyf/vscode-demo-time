import { useState, useEffect, useCallback, useRef } from 'react';
import { validateConfig } from '../utils/validation';
import { DemoConfig } from '@demotime/common';

interface UseAutoSaveOptions {
  config: DemoConfig;
  onSave: (config: DemoConfig) => Promise<boolean>;
  onSaveSuccess?: () => void;
  interval?: number; // in milliseconds
  enabled?: boolean;
}

export const useAutoSave = ({
  config,
  onSave,
  onSaveSuccess,
  interval = 30000, // 30 seconds default
  enabled = true,
}: UseAutoSaveOptions) => {
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );
  const [isManuallySaving, setIsManuallySaving] = useState(false);
  const lastConfigRef = useRef<string>('');
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performAutoSave = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const currentConfigString = JSON.stringify(config);

    // Don't auto-save if config hasn't changed
    if (currentConfigString === lastConfigRef.current) {
      return;
    }

    // Don't auto-save if there are validation errors
    const validation = validateConfig(config);
    if (!validation.isValid) {
      setAutoSaveStatus('idle');
      return;
    }

    setIsAutoSaving(true);
    setAutoSaveStatus('saving');

    try {
      const success = await onSave(config);
      if (success) {
        lastConfigRef.current = currentConfigString;
        setLastAutoSave(new Date());
        setAutoSaveStatus('saved');
        // Call success callback to mark config as clean
        onSaveSuccess?.();

        // Reset status to idle after 2 seconds
        statusResetTimeoutRef.current = setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } else {
        setAutoSaveStatus('error');
        if (statusResetTimeoutRef.current) {
          clearTimeout(statusResetTimeoutRef.current);
        }
        statusResetTimeoutRef.current = setTimeout(() => setAutoSaveStatus('idle'), 2000);
      }
    } catch {
      setAutoSaveStatus('error');
      if (statusResetTimeoutRef.current) {
        clearTimeout(statusResetTimeoutRef.current);
      }
      statusResetTimeoutRef.current = setTimeout(() => setAutoSaveStatus('idle'), 3000);
    } finally {
      setIsAutoSaving(false);
    }
  }, [config, onSave, enabled, onSaveSuccess]);

  const performManualSave = useCallback(async () => {
    setIsManuallySaving(true);
    setAutoSaveStatus('saving');

    try {
      const success = await onSave(config);
      if (success) {
        const currentConfigString = JSON.stringify(config);
        lastConfigRef.current = currentConfigString;
        setLastAutoSave(new Date());
        setAutoSaveStatus('saved');
        // Call success callback to mark config as clean
        onSaveSuccess?.();

        // Reset status to idle after 3 seconds for manual saves
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      } else {
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      }
    } catch {
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    } finally {
      setIsManuallySaving(false);
    }
  }, [config, onSave, onSaveSuccess]);

  // Debounced auto-save: only save after the user is idle for the interval
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set a new timeout to save after the user is idle for the interval
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, interval);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [config, interval, enabled, performAutoSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      if (statusResetTimeoutRef.current) {
        clearTimeout(statusResetTimeoutRef.current);
      }
    };
  }, []);

  const getAutoSaveStatusText = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return isManuallySaving ? 'Saving...' : 'Auto-saving...';
      case 'saved':
        return `Saved at ${lastAutoSave?.toLocaleTimeString()}`;
      case 'error':
        return isManuallySaving ? 'Save failed' : 'Auto-save failed';
      default:
        return lastAutoSave ? `Last saved: ${lastAutoSave.toLocaleTimeString()}` : 'Ready to save';
    }
  };

  const getAutoSaveStatusColor = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return 'text-blue-600';
      case 'saved':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return {
    isAutoSaving,
    isManuallySaving,
    lastAutoSave,
    autoSaveStatus,
    autoSaveStatusText: getAutoSaveStatusText(),
    autoSaveStatusColor: getAutoSaveStatusColor(),
    performAutoSave,
    performManualSave,
  };
};
