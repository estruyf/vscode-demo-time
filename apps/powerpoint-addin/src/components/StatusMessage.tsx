import * as React from 'react';

interface StatusMessageProps {
  text: string;
  type: string | null;
  visible: boolean;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ text, type, visible }) => {
  if (!visible) return null;

  return (
    <section className={`mt-4 p-2 rounded ${type || ''} ${visible ? 'block' : 'hidden'}`}>
      {text}
    </section>
  );
};
