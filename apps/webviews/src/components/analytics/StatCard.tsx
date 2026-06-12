import React from 'react';
import { Card } from '../ui/Card';

interface StatCardProps {
  label: string;
  value: string | number;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value }) => {
  return (
    <Card className="flex flex-col items-center gap-2 p-4">
      <span className="text-sm text-[var(--vscode-descriptionForeground)]">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
    </Card>
  );
};
