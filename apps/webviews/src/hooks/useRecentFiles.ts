import { Messenger } from '@estruyf/vscode/dist/client/webview/Messenger';
import { useState, useEffect, useCallback, useMemo } from 'react';

const RECENT_FILES_KEY = 'demo-time-recent-files';
const MAX_RECENT_FILES = 20;
const MAX_RECENT_FILES_VIEW = 10;

interface RecentFile {
  path: string;
  lastUsed: number;
  fileName: string;
}

export const useRecentFiles = (fileTypes: string[]) => {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  // Helper function to get file extension
  const getFileExtension = (filePath: string): string => {
    const lastDot = filePath.lastIndexOf('.');
    return lastDot !== -1 ? filePath.substring(lastDot) : '';
  };

  // Helper function to check if file matches allowed types
  const matchesFileTypes = useCallback(
    (filePath: string): boolean => {
      if (!fileTypes || fileTypes.length === 0) {
        return true;
      }
      const ext = getFileExtension(filePath).toLowerCase();
      return fileTypes
        .map((type) => (type.startsWith('.') ? type : `.${type}`))
        .map((type) => type.toLowerCase())
        .includes(ext);
    },
    [fileTypes],
  );

  // Load recent files from Messenger state on mount
  useEffect(() => {
    try {
      const crntState = (Messenger.getState() || {}) as Record<string, string>;
      const stored = crntState[RECENT_FILES_KEY];
      if (stored) {
        const parsed = JSON.parse(stored) as RecentFile[];
        // Sort by lastUsed descending (most recent first)
        const sorted = parsed.sort((a, b) => b.lastUsed - a.lastUsed);
        setRecentFiles(sorted);
      }
    } catch (error) {
      console.warn('Failed to load recent files from Messenger state:', error);
    }
  }, []);

  // Filter recent files by fileTypes for display
  const filteredRecentFiles = useMemo(() => {
    return (
      recentFiles.filter((file) => matchesFileTypes(file.path)).slice(0, MAX_RECENT_FILES_VIEW) ||
      []
    );
  }, [recentFiles, matchesFileTypes]);

  const addRecentFile = useCallback((filePath: string) => {
    if (!filePath.trim()) {
      return;
    }

    const fileName = filePath.split('/').pop() || filePath;
    const now = Date.now();

    setRecentFiles((prev) => {
      // Remove existing entry if it exists
      const filtered = prev.filter((f) => f.path !== filePath);

      // Add new entry at the beginning
      const newEntry: RecentFile = {
        path: filePath,
        lastUsed: now,
        fileName,
      };

      const files = [newEntry, ...filtered].slice(0, MAX_RECENT_FILES);

      // Save to Messenger state
      const crntState = Messenger.getState() || {};
      Messenger.setState({
        ...crntState,
        [RECENT_FILES_KEY]: JSON.stringify(files),
      });

      return files;
    });
  }, []);

  const removeRecentFile = useCallback((filePath: string) => {
    setRecentFiles((prev) => {
      const updated = prev.filter((f) => f.path !== filePath);

      // Save to Messenger state
      const crntState = Messenger.getState() || {};
      Messenger.setState({
        ...crntState,
        [RECENT_FILES_KEY]: JSON.stringify(updated),
      });

      return updated;
    });
  }, []);

  const clearRecentFiles = useCallback(() => {
    setRecentFiles([]);

    // Save to Messenger state
    const crntState = Messenger.getState() || {};
    Messenger.setState({
      ...crntState,
      [RECENT_FILES_KEY]: JSON.stringify([]),
    });
  }, []);

  return {
    recentFiles: filteredRecentFiles,
    addRecentFile,
    removeRecentFile,
    clearRecentFiles,
  };
};
