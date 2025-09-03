import React from 'react';
import { Clock, FileText, Hash, Timer } from 'lucide-react';
import { DemoConfig } from '../../types/demo';

interface DemoFileMetadataProps {
  config: DemoConfig;
  demoCount: number;
  stepCount: number;
  estimatedMinutes: number;
}

export const DemoFileMetadata: React.FC<DemoFileMetadataProps> = ({
  config,
  demoCount,
  stepCount,
  estimatedMinutes,
}) => {
  return (
    <div className="bg-demo-time-gray-7 rounded-lg p-4 space-y-3">
      {/* File Configuration Info */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-demo-time-white">Configuration</h4>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Hash className="h-4 w-4 text-demo-time-gray-4" />
            <span className="text-demo-time-gray-4">Version:</span>
            <span className="text-demo-time-white font-medium">{config.version || 1}</span>
          </div>

          {config.timer && (
            <div className="flex items-center space-x-2">
              <Timer className="h-4 w-4 text-demo-time-gray-4" />
              <span className="text-demo-time-gray-4">Timer:</span>
              <span className="text-demo-time-white font-medium">{config.timer}min</span>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-demo-time-white">Statistics</h4>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <FileText className="h-4 w-4 text-demo-time-accent" />
            </div>
            <div className="font-bold text-demo-time-white">{demoCount}</div>
            <div className="text-demo-time-gray-4 text-xs">Demo{demoCount !== 1 ? 's' : ''}</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Hash className="h-4 w-4 text-demo-time-accent" />
            </div>
            <div className="font-bold text-demo-time-white">{stepCount}</div>
            <div className="text-demo-time-gray-4 text-xs">Step{stepCount !== 1 ? 's' : ''}</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-4 w-4 text-demo-time-accent" />
            </div>
            <div className="font-bold text-demo-time-white">~{estimatedMinutes}</div>
            <div className="text-demo-time-gray-4 text-xs">minute{estimatedMinutes !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      {/* Description */}
      {config.description && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-demo-time-white">Description</h4>
          <p className="text-sm text-demo-time-gray-4 leading-relaxed">
            {config.description}
          </p>
        </div>
      )}
    </div>
  );
};