import React from 'react';
import { Streamdown } from 'streamdown';

interface NotesProps {
  notes: string;
}

export const Notes: React.FC<NotesProps> = ({ notes }) => {
  return (
    <div className="flex-1 bg-[#1a1f2e] border-l border-gray-700/30 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-700/30">
        <h3 className="text-lg font-semibold text-white">Notes</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="prose prose-invert max-w-none">
          <Streamdown className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
            {notes}
          </Streamdown>
        </div>
      </div>
    </div>
  );
};
