import React from 'react';
import { ChevronDown, ChevronRight, FileText, BarChart3, Clapperboard, Presentation } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { DemoFileGrid } from './DemoFileGrid';
import { DemoFileData, OverviewGridItem } from '../../types/demoOverview';
import { WebViewMessages } from '@demotime/common';
import { messageHandler } from '@estruyf/vscode/dist/client';

interface DemoFileSectionProps {
  fileData: DemoFileData;
  isExpanded: boolean;
  onToggle: () => void;
  allGridItems: OverviewGridItem[];
}

export const DemoFileSection: React.FC<DemoFileSectionProps> = ({
  fileData,
  isExpanded,
  onToggle,
  allGridItems,
}) => {
  const { fileName, filePath, config } = fileData;

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

  const handleEditConfig = React.useMemo(
    () => () => {
      messageHandler.send(WebViewMessages.toVscode.overview.openConfig, filePath);
    },
    [filePath]
  );

  return (
    <Card className="overflow-hidden">
      {/* Section Header */}
      <div className={`${isExpanded ? 'border-b border-demo-time-gray-3 pb-6 mb-6' : ''}`}>
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
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {fileName}
                </h3>
                {config.title && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {config.title}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300 shrink-0 ml-4">
              <span className="flex items-center space-x-1">
                <span className="font-medium">{indexRange}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="font-medium">{itemCount}</span>
                <span>items</span>
              </span>
            </div>
          </button>

          <Button variant="secondary" onClick={handleEditConfig} size="sm">
            Open config
          </Button>
        </div>

        {/* File Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2 text-sm">
            <Clapperboard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-gray-600 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">{demoCount}</span> demo{demoCount !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-sm">
            <Presentation className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-gray-600 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">{slideCount}</span> slide{slideCount !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-sm">
            <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-gray-600 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">{stepCount}</span> step{stepCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {config.description && isExpanded && (
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
            <p className="text-sm text-gray-700 dark:text-gray-300">{config.description}</p>
          </div>
        )}
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div className="">
          <DemoFileGrid
            fileData={fileData}
            gridItems={allGridItems}
          />
        </div>
      )}
    </Card>
  );
};
