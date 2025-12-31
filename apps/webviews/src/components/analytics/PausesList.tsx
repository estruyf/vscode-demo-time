import React from 'react';
import { Pause, Clock, MapPin } from 'lucide-react';
import { PauseRecord } from '@demotime/common';
import { formatDuration } from '../../utils';
import { Card } from '../ui/Card';

interface PausesListProps {
  pauses: PauseRecord[];
}

export const PausesList: React.FC<PausesListProps> = ({ pauses }) => {
  if (pauses.length === 0) {
    return null;
  }

  return (
    <section>
      <p className="text-sm text-(--vscode-descriptionForeground) m-0 mb-4 leading-relaxed">
        These are the moments where you spent the most time on a single action or slide, typically indicating extended explanations, Q&A, or detailed discussions. Use this to identify which topics engage your audience most.
      </p>
      <div className="flex flex-col gap-3">
        {pauses.slice(0, 5).map((pause, idx) => (
          <Card
            key={idx}
            className="p-4 transition-all hover:shadow-lg hover:border-(--vscode-focusBorder)"
          >
            {/* Header with ranking and duration */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-(--vscode-badge-background) text-(--vscode-badge-foreground) text-xs font-bold">
                  {idx + 1}
                </span>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-(--vscode-descriptionForeground)" />
                  <span className="font-mono font-bold text-lg">{formatDuration(pause.duration)}</span>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="w-4 h-4 text-(--vscode-descriptionForeground) mt-0.5 shrink-0" />
              <span className="font-medium text-sm flex-1">{pause.location}</span>
            </div>

            {/* Context */}
            {pause.context && (
              <div className="mt-2 pt-2 border-t border-(--vscode-panel-border)">
                <p className="text-xs text-(--vscode-descriptionForeground) m-0 font-mono">
                  {pause.context}
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
};
