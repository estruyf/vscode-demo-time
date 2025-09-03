import React from 'react';
import { ArrowDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FlowConnectorProps {
  isSmall?: boolean;
  className?: string;
}

export const FlowConnector: React.FC<FlowConnectorProps> = ({
  isSmall = false,
  className = ''
}) => {
  return (
    <div className={cn(
      "flex items-center justify-center",
      isSmall ? "py-2 ml-2" : "py-4",
      className
    )}>
      <div className={cn(
        "flex flex-col items-center",
        isSmall ? "space-y-1" : "space-y-2"
      )}>
        <div className={cn(
          "bg-demo-time-gray-4 rounded-full",
          isSmall ? "w-1 h-4" : "w-2 h-6"
        )} />
        <ArrowDown className={cn(
          "text-demo-time-gray-4",
          isSmall ? "h-3 w-3" : "h-4 w-4"
        )} />
      </div>
    </div>
  );
};