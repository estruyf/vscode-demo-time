import React from 'react';
import { Target, Video } from 'lucide-react';
import { SessionInfo } from '../../types/analytics';

interface SessionListProps {
  sessions: SessionInfo[];
  selectedSession: SessionInfo | null;
  onSelectSession: (session: SessionInfo) => void;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  selectedSession,
  onSelectSession,
}) => {
  if (sessions.length === 0) {
    return (
      <p className="text-[var(--vscode-descriptionForeground)] text-sm">
        No analytics sessions found. Start a recording to generate analytics data.
      </p>
    );
  }

  return (
    <ul className="list-none p-0 m-0">
      {sessions.map((session) => (
        <li
          key={session.filename}
          className={`
            flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors
            hover:bg-[var(--vscode-list-hoverBackground)]
            ${selectedSession?.filename === session.filename
              ? 'bg-[var(--vscode-list-activeSelectionBackground)] text-[var(--vscode-list-activeSelectionForeground)]'
              : ''
            }
          `}
          onClick={() => onSelectSession(session)}
        >
          {session.isDryRun ? (
            <Target className="w-5 h-5" />
          ) : (
            <Video className="w-5 h-5" />
          )}
          <div className="flex flex-col">
            <span className="font-medium">
              {session.isDryRun ? 'Dry Run' : 'Live'}
            </span>
            <span
              className={`text-xs ${selectedSession?.filename === session.filename
                ? 'opacity-80'
                : 'text-[var(--vscode-descriptionForeground)]'
                }`}
            >
              {session.date}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
};
