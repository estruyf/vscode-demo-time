import React from 'react';

interface RecordingIndicatorProps {
  isRecording: boolean;
}

export const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({ isRecording }) => {
  if (!isRecording) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[var(--vscode-inputValidation-warningBackground)] border border-[var(--vscode-inputValidation-warningBorder)] rounded">
      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
      Recording in progress...
    </div>
  );
};
