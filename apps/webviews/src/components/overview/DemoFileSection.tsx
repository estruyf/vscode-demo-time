import React from 'react';
import { ChevronDown, ChevronRight, FileText, Clock, Settings } from 'lucide-react';
import { DemoConfig, Demo } from '../../types/demo';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { DemoFileCard } from './DemoFileCard';

interface DemoFileSectionProps {
  fileName: string;
  config: DemoConfig;
  startingIndex: number;
  isCollapsed: boolean;
  onToggle: () => void;
  onEditDemo: (demoIndex: number) => void;
  onPlayDemo: (demo: Demo, demoIndex: number) => void;
}

export const DemoFileSection: React.FC<DemoFileSectionProps> = ({
  fileName,
  config,
  startingIndex,
  isCollapsed,
  onToggle,
  onEditDemo,
  onPlayDemo,
}) => {
  // Calculate section stats
  const demoCount = config?.demos?.length || 0;
  const stepCount = config?.demos?.reduce((total, demo) => total + demo.steps.length, 0) || 0;
  const estimatedMinutes = Math.ceil(stepCount * 3 / 60);

  // Get display name for file
  const displayName = fileName.split('/').pop() || fileName;
  
  return (
    <Card>
      {/* Section Header */}
      <div className="p-4 border-b border-demo-time-gray-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onToggle}
            className="flex items-center space-x-3 text-left flex-1 hover:bg-demo-time-gray-7 rounded-md p-2 -m-2 transition-colors"
          >
            <div className="flex-shrink-0">
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5 text-demo-time-gray-4" />
              ) : (
                <ChevronDown className="h-5 w-5 text-demo-time-gray-4" />
              )}
            </div>
            
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="bg-demo-time-accent rounded-lg p-2">
                <FileText className="h-4 w-4 text-demo-time-black" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-demo-time-white truncate" title={fileName}>
                  {displayName}
                </h3>
                <p className="text-sm text-demo-time-gray-4 truncate" title={config.title}>
                  {config.title}
                </p>
              </div>
            </div>
          </button>

          {/* Section Stats */}
          <div className="flex items-center space-x-6 text-sm text-demo-time-gray-4 ml-4">
            <div className="flex items-center space-x-1">
              <span className="font-medium text-demo-time-white">{demoCount}</span>
              <span>demo{demoCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="font-medium text-demo-time-white">{stepCount}</span>
              <span>step{stepCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span className="font-medium text-demo-time-white">~{estimatedMinutes}min</span>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              icon={Settings}
              onClick={(e) => {
                e.stopPropagation();
                // Open file editor for this specific demo file
                console.log('Edit file:', fileName);
              }}
              title={`Edit ${displayName}`}
            />
          </div>
        </div>

        {/* Optional: Config description */}
        {!isCollapsed && config.description && (
          <div className="mt-3 ml-8">
            <p className="text-sm text-demo-time-gray-4">
              {config.description}
            </p>
          </div>
        )}
      </div>

      {/* Section Content */}
      {!isCollapsed && (
        <div className="p-4">
          {demoCount === 0 ? (
            <div className="text-center py-8 text-demo-time-gray-4">
              <FileText className="h-8 w-8 mx-auto mb-2 text-demo-time-gray-5" />
              <p className="text-sm">No demos in this file</p>
            </div>
          ) : (
            <div className="space-y-4">
              {config.demos.map((demo, demoIndex) => (
                <DemoFileCard
                  key={demo.id || `${fileName}-${demoIndex}`}
                  demo={demo}
                  globalIndex={startingIndex + demoIndex}
                  demoIndex={demoIndex}
                  fileName={fileName}
                  onEdit={() => onEditDemo(startingIndex + demoIndex - 1)}
                  onPlay={() => onPlayDemo(demo, demoIndex)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};