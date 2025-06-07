import { useState, useCallback } from "react";

interface StatusMessage {
  text: string;
  type: string | null;
  visible: boolean;
}

interface UseStatusMessageReturn {
  statusMessage: StatusMessage;
  showStatus: (text: string, type: string) => void;
  clearStatus: () => void;
}

export const useStatusMessage = (timeout: number = 3000): UseStatusMessageReturn => {
  const [statusMessage, setStatusMessage] = useState<StatusMessage>({
    text: "",
    type: null,
    visible: false,
  });

  const showStatus = useCallback(
    (text: string, type: string) => {
      setStatusMessage({
        text,
        type,
        visible: true,
      });

      if (timeout > 0) {
        setTimeout(() => {
          setStatusMessage((prev) => ({ ...prev, visible: false }));
        }, timeout);
      }
    },
    [timeout]
  );

  const clearStatus = useCallback(() => {
    setStatusMessage((prev) => ({ ...prev, visible: false }));
  }, []);

  return { statusMessage, showStatus, clearStatus };
};
