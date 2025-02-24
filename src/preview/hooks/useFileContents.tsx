import { useState, useCallback } from 'react';

export const useFileContents = () => {
  const [content, setContent] = useState<string | undefined>(undefined);
  const [crntFilePath, setCrntFilePath] = useState<string | undefined>(undefined);

  const getFileContents = useCallback(async (fileUri: string) => {
    if (!fileUri) {
      setCrntFilePath(undefined);
      return;
    }

    setCrntFilePath(fileUri);

    fetch(fileUri)
      .then((response) => response.text())
      .then((text) => {
        setContent(text);
      });
  }, []);

  return { content, crntFilePath, getFileContents };
};