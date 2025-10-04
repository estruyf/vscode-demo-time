import React, { useEffect, useMemo, useRef } from 'react';
import { ApiData, DemoStep } from '../types/api';
import { DemoStep as DemoStepComponent } from './DemoStep';
import { Clock } from './Clock';

interface DemoListProps {
  apiData: ApiData;
  onRunById: (id: string, bringToFront?: boolean) => Promise<void>;
}

export const DemoList: React.FC<DemoListProps> = ({ apiData, onRunById }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const nextItemRef = useRef<HTMLDivElement>(null);

  const handleRunDemo = async (id: string) => {
    try {
      await onRunById(id, true);
    } catch (error) {
      console.error('Failed to run demo:', error);
    }
  };

  const isNextDemo = (step: DemoStep) => {
    return apiData.nextDemo?.title === step.originalLabel;
  };

  const nextDemoFile = useMemo(() => {
    const currentFileIdx = apiData.demos.findIndex(demo => demo.demoFilePath === apiData.currentDemoFile);
    return apiData.demos[currentFileIdx + 1];
  }, [apiData.demos]);

  useEffect(() => {
    const scrollToCenter = () => {
      if (nextItemRef.current && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const element = nextItemRef.current;

        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        const relativeTop = elementRect.top - containerRect.top;
        const currentScroll = container.scrollTop;
        const elementMiddle = relativeTop + currentScroll + (elementRect.height / 2);
        const containerMiddle = containerRect.height / 2;

        const scrollTo = elementMiddle - containerMiddle;

        container.scrollTo({
          top: scrollTo,
          behavior: 'smooth'
        });
      }
    };

    setTimeout(scrollToCenter, 100);
  }, [apiData.nextDemo]);

  return (
    <div className="card flex flex-col h-full">
      <div className="mb-4 flex-shrink-0 flex items-center justify-between">
        <div className="p-4 border-b border-gray-700/30">
          <h2 className="text-lg font-semibold text-white">Steps</h2>
        </div>
        <div className='block md:hidden'>
          <Clock clock={apiData?.clock} />
        </div>
      </div>

      {apiData.demos.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📁</div>
          <p className="text-gray-400 text-lg">No demo steps found</p>
          <p className="text-sm text-gray-500 mt-2">
            Load a demo file in Demo Time to see demos here
          </p>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="space-y-4 overflow-y-auto flex-1 -mx-6 px-6"
          style={{ scrollbarGutter: 'stable' }}
        >
          {apiData.demos.map((demoFile, demoIndex) => {
            const isCurrentFile = demoFile.demoFilePath === apiData.currentDemoFile;
            const isNextFile = nextDemoFile?.demoFilePath === demoFile.demoFilePath;
            const hasExecutedSteps = demoFile.children.some(step => step.hasExecuted);

            return (
              <div key={demoIndex} className="space-y-2">
                {/* Demo File Header */}
                <div className={`sticky top-0 z-10 px-3 py-2 rounded-lg border backdrop-blur ${isCurrentFile
                  ? 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                  : isNextFile
                    ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300'
                    : hasExecutedSteps
                      ? 'bg-green-500/10 border-green-500/20 text-green-300'
                      : 'bg-gray-700/50 border-gray-600/30 text-gray-400'
                  }`}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                      backgroundColor: isCurrentFile ? '#3b82f6' :
                        isNextFile ? '#eab308' :
                          hasExecutedSteps ? '#22c55e' : '#6b7280'
                    }}></div>
                    <span className="font-semibold text-sm truncate">{demoFile.label}</span>
                    {isCurrentFile && <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded-full ml-auto">CURRENT</span>}
                    {isNextFile && <span className="text-xs bg-yellow-500/20 px-2 py-0.5 rounded-full ml-auto">NEXT</span>}
                  </div>
                  {demoFile.description && (
                    <p className="text-xs mt-1 opacity-80">{demoFile.description}</p>
                  )}
                </div>

                {/* Demo Steps */}
                <div className="space-y-1">
                  {demoFile.children.map((step, stepIndex) => {
                    const isExecuted = step.hasExecuted;
                    const isNext = isNextDemo(step);
                    const isActive = step.isActive;

                    return (
                      <DemoStepComponent
                        key={`${demoIndex}-${stepIndex}`}
                        step={step}
                        index={stepIndex}
                        isNext={isNext}
                        isActive={isActive}
                        isExecuted={isExecuted}
                        nextItemRef={nextItemRef}
                        onRunDemo={handleRunDemo}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
