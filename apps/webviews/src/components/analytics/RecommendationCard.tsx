import React from 'react';
import { Lightbulb } from 'lucide-react';
import { Card } from '../ui/Card';
import { Recommendation as RecommendationType } from '@demotime/common';

interface RecommendationCardProps {
  recommendation: RecommendationType;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation }) => {
  const priorityColors = {
    high: 'border-l-red-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-blue-500',
  };

  const priorityBadgeColors = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };

  return (
    <Card className={`border-l-4 ${priorityColors[recommendation.priority]} p-3`}>
      <div className="flex gap-2 mb-2">
        <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] uppercase">
          {recommendation.type}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${priorityBadgeColors[recommendation.priority]} text-white uppercase`}>
          {recommendation.priority}
        </span>
      </div>
      <h4 className="m-0 mb-1">{recommendation.title}</h4>
      <p className="m-0 text-[var(--vscode-descriptionForeground)]">
        {recommendation.description}
      </p>
      {recommendation.suggestion && (
        <p className="mt-2 m-0 italic text-[var(--vscode-descriptionForeground)] flex items-center gap-2">
          <Lightbulb className="w-4 h-4 shrink-0" />
          {recommendation.suggestion}
        </p>
      )}
    </Card>
  );
};
