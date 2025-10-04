import React, { useEffect, useRef } from 'react';
import { ApiData, DemoStep } from '../types/api';
import { DemoStep as DemoStepComponent } from './DemoStep';

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

  const allSteps: DemoStep[] = [];
  apiData.demos.forEach(demoFile => {
    demoFile.children.forEach(step => {
      allSteps.push(step);
    });
  });

  const isNextDemo = (step: DemoStep) => {
    return apiData.nextDemo?.title === step.originalLabel;
  };

  const isCurrentStep = (step: DemoStep) => {
    return step.isActive;
  };

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
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-white">
          All steps
        </h2>
      </div>

      {allSteps.length === 0 ? (
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
          className="space-y-1 overflow-y-auto flex-1 -mx-6 px-6"
          style={{ scrollbarGutter: 'stable' }}
        >
          {allSteps.map((step, index) => {
            const isExecuted = step.hasExecuted;
            const isNext = isNextDemo(step);
            const isActive = isCurrentStep(step);

            return (
              <DemoStepComponent
                key={index}
                step={step}
                index={index}
                isNext={isNext}
                isActive={isActive}
                isExecuted={isExecuted}
                nextItemRef={nextItemRef}
                onRunDemo={handleRunDemo}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
