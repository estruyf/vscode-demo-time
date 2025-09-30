import React, { useEffect, useRef } from 'react';
import { ApiData, DemoStep } from '../types/api';
import { Icon } from 'vscrui';

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
          All Demos
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

            return (
              <div
                key={index}
                ref={isNext ? nextItemRef : null}
                className={`flex items-center gap-3 py-3 transition-all duration-200 hover:bg-gray-700/20 rounded-lg px-3 -mx-3 ${isNext ? 'bg-[#FFD23F]/10' : ''} ${step.id ? 'cursor-pointer' : ''}`}
                onClick={step.id ? () => handleRunDemo(step.id as string) : undefined}
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                  {isExecuted ? (
                    <Icon name={step.iconPath.id as never} className="!text-[#4ade80]" size={18} />
                  ) : isNext ? (
                    <Icon name={step.iconPath.id as never} className="!text-[#FFD23F]" size={18} />
                  ) : (
                    <Icon name={step.iconPath.id as never} className="!text-gray-500" size={18} />
                  )}
                </div>
                <span
                  className={`font-medium text-base ${isNext
                    ? 'text-white font-semibold'
                    : isExecuted
                      ? 'text-gray-400'
                      : 'text-gray-200'
                    }`}
                >
                  {step.originalLabel}
                </span>

                {
                  step.id && (
                    <Icon name={`play`} className={`isExecuted ? 'text-gray-400' : 'text-gray-200'} ml-auto`} size={16} />
                  )
                }
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};