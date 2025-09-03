import React, { useState } from 'react';
import { Grid, List } from 'lucide-react';
import { Button } from '../ui/Button';
import DemoGridCard from './DemoGridCard';
import SlideGridCard from './SlideGridCard';
import { DemoFileData, OverviewGridItem } from '../../types/demoOverview';

interface DemoFileGridProps {
  fileData: DemoFileData;
  gridItems: OverviewGridItem[];
  onEditDemo: (fileName: string, demoIndex: number) => void;
  onPlayDemo: (fileName: string, demo: any, demoIndex: number) => void;
}

export const DemoFileGrid: React.FC<DemoFileGridProps> = ({
  fileData,
  gridItems,
  onEditDemo,
  onPlayDemo,
}) => {
  const [selectedItem, setSelectedItem] = useState<{ type: 'demo' | 'slide'; globalIndex: number } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (gridItems.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-demo-time-gray-4 mb-2">No demos found in this file</div>
        <p className="text-sm text-demo-time-gray-5">Add some demos to see them here</p>
      </div>
    );
  }

  const handleItemClick = (globalIndex: number, type: 'demo' | 'slide') => {
    if (selectedItem?.globalIndex === globalIndex) {
      setSelectedItem(null);
    } else {
      setSelectedItem({ type, globalIndex });
    }
  };

  const handleEditDemo = (demoIndex: number) => {
    onEditDemo(fileData.fileName, demoIndex);
  };

  const handlePlayDemo = (demo: any, demoIndex: number) => {
    onPlayDemo(fileData.fileName, demo, demoIndex);
  };

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-demo-time-white">
          Demo Items ({gridItems.length})
        </h4>
        <div className="flex items-center space-x-2 bg-demo-time-gray-6 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-demo-time-black text-demo-time-white shadow-sm'
                : 'text-demo-time-gray-3 hover:text-demo-time-gray-2'
            }`}
          >
            <Grid className="h-4 w-4" />
            <span>Grid</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-demo-time-black text-demo-time-white shadow-sm'
                : 'text-demo-time-gray-3 hover:text-demo-time-gray-2'
            }`}
          >
            <List className="h-4 w-4" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Grid/List View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 auto-rows-fr">
          {gridItems.sort((a, b) => a.globalIndex - b.globalIndex).map((item) => (
            <div
              key={`${item.type}-${item.globalIndex}`}
              className={`h-full ${
                selectedItem?.globalIndex === item.globalIndex ? 'ring-2 ring-blue-500 ring-offset-2' : ''
              }`}
            >
              {item.type === 'demo' && item.demo ? (
                <DemoGridCard
                  demo={item.demo}
                  demoIndex={item.demoIndex!}
                  globalIndex={item.globalIndex}
                  isSelected={selectedItem?.globalIndex === item.globalIndex}
                  onClick={() => handleItemClick(item.globalIndex, 'demo')}
                  onEdit={() => handleEditDemo(item.demoIndex!)}
                  onPlay={() => handlePlayDemo(item.demo!, item.demoIndex!)}
                />
              ) : item.slide ? (
                <SlideGridCard
                  slide={item.slide}
                  slideIndex={item.slideIndex!}
                  globalIndex={item.globalIndex}
                  isSelected={selectedItem?.globalIndex === item.globalIndex}
                  onClick={() => handleItemClick(item.globalIndex, 'slide')}
                  onEdit={() => handleEditDemo(item.slide!.demoIndex)}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {gridItems.sort((a, b) => a.globalIndex - b.globalIndex).map((item) => (
            <div
              key={`${item.type}-${item.globalIndex}`}
              className={`p-4 border border-demo-time-gray-6 rounded-lg hover:bg-demo-time-gray-6 transition-colors cursor-pointer ${
                selectedItem?.globalIndex === item.globalIndex ? 'border-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => handleItemClick(item.globalIndex, item.type)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-demo-time-accent rounded-lg text-demo-time-black font-bold text-sm">
                    {item.globalIndex}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        item.type === 'demo' 
                          ? 'text-yellow-700 bg-yellow-100' 
                          : 'text-purple-700 bg-purple-100'
                      }`}>
                        {item.type.toUpperCase()}
                      </span>
                      <h4 className="font-semibold text-demo-time-white text-sm truncate">
                        {item.type === 'demo' ? item.demo?.title : 'Slide'}
                      </h4>
                    </div>
                    {item.demo?.description && (
                      <p className="text-xs text-demo-time-gray-4 mt-1 truncate">
                        {item.demo.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditDemo(item.demoIndex || 0);
                    }}
                    icon={Settings}
                    size="sm"
                  >
                  </Button>
                  {item.type === 'demo' && (
                    <Button
                      variant="success"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayDemo(item.demo!, item.demoIndex!);
                      }}
                      icon={Play}
                      size="sm"
                    >
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {selectedItem?.globalIndex === item.globalIndex && item.demo && (
                <div className="mt-4 pt-4 border-t border-demo-time-gray-6 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-demo-time-gray-4">Steps:</span>
                      <span className="ml-1 text-demo-time-white font-medium">
                        {item.demo.steps.length}
                      </span>
                    </div>
                    {item.demo.id && (
                      <div>
                        <span className="text-demo-time-gray-4">ID:</span>
                        <span className="ml-1 text-demo-time-white font-mono text-xs">
                          {item.demo.id}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {item.demo.steps.length > 0 && (
                    <div className="mt-3">
                      <span className="text-demo-time-gray-4 text-xs">Actions:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.demo.steps.slice(0, 5).map((step: any, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-demo-time-gray-6 text-demo-time-gray-3 rounded-full text-xs"
                          >
                            {step.action}
                          </span>
                        ))}
                        {item.demo.steps.length > 5 && (
                          <span className="px-2 py-0.5 bg-demo-time-gray-5 text-demo-time-gray-3 rounded-full text-xs">
                            +{item.demo.steps.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};