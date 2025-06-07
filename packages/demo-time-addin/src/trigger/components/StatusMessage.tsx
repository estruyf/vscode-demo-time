import * as React from 'react';

interface StatusMessageProps {
  text: string;
  type: string | null;
  visible: boolean;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ text, type, visible }) => {
  if (!visible) return null;

  return (
    <div id="statusMessage" className={type || ''} style={{ display: 'block' }}>
      {text}
    </div>
  );
};
