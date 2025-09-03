import React from 'react';
import { ChevronDown, ChevronRight, FileText, Play, Settings, BarChart3, Clapperboard, Presentation, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { DemoFileGrid } from './DemoFileGrid';
import { DemoFileData, OverviewGridItem } from '../../types/demoOverview';

interface DemoFileSectionProps {
  fileData: DemoFileData;
  isExpanded: boolean;
  onToggle: () => void;
  onEditDemo: (fileName: string, demoIndex: number) => void;
  onPlayDemo: (fileName: string, demo: any, demoIndex: number) => void;
  allGridItems: OverviewGridItem[];
}

export const DemoFileSection: React.FC<DemoFileSectionProps> = ({
  fileData,
  isExpanded,
  onToggle,
  onEditDemo,
  onPlayDemo,
  allGridItems,
}) => {
  const { fileName, config } = fileData;

  // Calculate stats for this file
  const demoCount = (config.demos || []).length;
  const stepCount = (config.demos || []).reduce((sum, demo) => sum + demo.steps.length, 0);
  const slideCount = allGridItems.filter(item => item.type === 'slide').length;
  const itemCount = allGridItems.length;

  // Get range of global indices for this file
  const indices = allGridItems.map(item => item.globalIndex).sort((a, b) => a - b);
  const indexRange = indices.length > 0 ?
    indices.length === 1 ? `#${indices[0]}` : `#${indices[0]}-${indices[indices.length - 1]}` :
    'No items';

  const handleEditConfig = () => {
    // In a real implementation, you'd send a message to VS Code to open this file
    console.log('Edit config for:', fileName);
  };

  const handleRunFile = () => {
    // Run the first demo in this file
    if (config.demos && config.demos.length > 0) {
      onPlayDemo(fileName, config.demos[0], 0);
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Section Header */}
      <div className={`${isExpanded ? 'border-b border-demo-time-gray-6' : ''}`}>
        <div className="flex items-center justify-between">
          <button
            onClick={onToggle}
            className="flex items-center space-x-3 text-left flex-1 min-w-0 hover:text-demo-time-gray-2 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-demo-time-gray-4 shrink-0" />
            ) : (
              <ChevronRight className="h-5 w-5 text-demo-time-gray-4 shrink-0" />
            )}

            <div className="flex items-center space-x-3 min-w-0">
              <FileText className="h-6 w-6 text-demo-time-accent shrink-0" />
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-demo-time-white truncate">
                  {fileName}
                </h3>
                {config.title && (
                  <p className="text-sm text-demo-time-gray-4 truncate">
                    {config.title}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-demo-time-gray-4 shrink-0 ml-4">
              <span className="flex items-center space-x-1">
                <span className="font-medium">{indexRange}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="font-medium">{itemCount}</span>
                <span>items</span>
              </span>
            </div>
          </button>

          <div className="flex items-center space-x-2 ml-4">
            <Button variant="secondary" onClick={handleEditConfig} icon={Settings} size="sm">
              Edit
            </Button>
            {demoCount > 0 && (
              <Button variant="success" onClick={handleRunFile} icon={Play} size="sm">
                Run
              </Button>
            )}
          </div>
        </div>

        {/* File Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2 text-sm">
            <Clapperboard className="h-4 w-4 text-demo-time-accent" />
            <span className="text-demo-time-gray-4">
              <span className="font-medium text-demo-time-white">{demoCount}</span> demo{demoCount !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-sm">
            <Presentation className="h-4 w-4 text-demo-time-accent" />
            <span className="text-demo-time-gray-4">
              <span className="font-medium text-demo-time-white">{slideCount}</span> slide{slideCount !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-sm">
            <BarChart3 className="h-4 w-4 text-demo-time-accent" />
            <span className="text-demo-time-gray-4">
              <span className="font-medium text-demo-time-white">{stepCount}</span> step{stepCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {config.description && isExpanded && (
          <div className="mt-4 p-3 bg-demo-time-gray-6 rounded-md">
            <p className="text-sm text-demo-time-gray-2">{config.description}</p>
          </div>
        )}
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div className="p-6">
          <DemoFileGrid
            fileData={fileData}
            gridItems={allGridItems}
            onEditDemo={onEditDemo}
            onPlayDemo={onPlayDemo}
          />
        </div>
      )}
    </Card>
  );
};
