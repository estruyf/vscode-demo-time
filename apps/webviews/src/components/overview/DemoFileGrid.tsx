import React from 'react';
import DemoGridCard from './DemoGridCard';
import SlideGridCard from './SlideGridCard';
import { DemoFileData, OverviewGridItem } from '../../types/demoOverview';
import { WebViewMessages } from '@demotime/common';
import { messageHandler } from '@estruyf/vscode/dist/client';

interface DemoFileGridProps {
  fileData: DemoFileData;
  gridItems: OverviewGridItem[];
}

export const DemoFileGrid: React.FC<DemoFileGridProps> = ({
  fileData,
  gridItems,
}) => {
  const { filePath, config } = fileData;

  if (gridItems.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-demo-time-gray-4 mb-2">No demos found in this file</div>
        <p className="text-sm text-demo-time-gray-5">Add some demos to see them here</p>
      </div>
    );
  }

  const handleItemClick = (item: OverviewGridItem, type: 'demo' | 'slide') => {
    if (type === 'slide') {
      if (!item.slide) { return; }
      messageHandler.send(WebViewMessages.toVscode.overview.openSlide, {
        filePath: item.slide.filePath,
        slideIndex: item.slide.index,
      });
      return;
    }

    const steps = item.demo?.steps;
    if (!steps || steps.length === 0) { return; }
    void messageHandler
      .request(WebViewMessages.toVscode.overview.runDemoSteps, { steps })
      .catch(console.error);
  };

  const handleEditDemo = (demoIndex: number) => {
    const originalLabel = config?.demos?.[demoIndex]?.title;
    if (originalLabel === undefined) { return; }
    messageHandler.send(WebViewMessages.toVscode.overview.openConfigStep, {
      demoFilePath: filePath,
      stepIndex: demoIndex,
      originalLabel,
    });
  };

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-demo-time-white">
          Items ({gridItems.length})
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 auto-rows-fr">
        {[...gridItems].sort((a, b) => a.globalIndex - b.globalIndex).map((item) => (
          <div
            key={`${item.type}-${item.globalIndex}`}
            className={`h-full`}
          >
            {item.type === 'demo' && item.demo ? (
              <DemoGridCard
                demo={item.demo}
                demoIndex={item.demoIndex!}
                globalIndex={item.globalIndex}
                onClick={() => handleItemClick(item, 'demo')}
                onEdit={() => handleEditDemo(item.demoIndex!)}
              />
            ) : item.slide ? (
              <SlideGridCard
                slide={item.slide}
                demo={item.demo}
                slideIndex={item.slideIndex!}
                totalSlides={item.totalSlides!}
                globalIndex={item.globalIndex}
                onClick={() => handleItemClick(item, 'slide')}
                onEdit={() => handleEditDemo(item.slide!.demoIndex)}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};
