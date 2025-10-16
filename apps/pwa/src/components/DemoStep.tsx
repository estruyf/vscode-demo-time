import React, { useMemo } from 'react';
import { DemoStep as DemoStepType } from '../types/api';
import { Icon } from 'vscrui';

interface DemoStepProps {
  step: DemoStepType;
  index: number;
  isNext: boolean;
  isActive: boolean;
  isExecuted: boolean;
  nextItemRef?: React.RefObject<HTMLDivElement>;
  onRunDemo: (id: string) => void;
}

export const DemoStep: React.FC<DemoStepProps> = ({
  step,
  index,
  isNext,
  isActive,
  isExecuted,
  nextItemRef,
  onRunDemo,
}) => {
  const updatedDescription = useMemo(() => {
    if (!step.description) {
      return '';
    }

    let desc = step.description;
    if (desc.includes(`[Disabled]`)) {
      desc = desc.replace(`[Disabled]`, '').trim();
    }
    if (desc.includes(`←`)) {
      desc = desc.replace(`←`, '').trim();
    }
    return desc;
  }, [step.description]);

  if (!step.demoFilePath) {
    return null;
  }

  return (
    <div
      key={index}
      ref={isNext ? nextItemRef : null}
      className={`flex flex-col transition-all duration-200 hover:bg-gray-700/20 rounded-lg px-3 py-3 ${isActive ? 'bg-blue-500/20 border border-blue-500/30' : isNext ? 'bg-[#FFD23F]/10' : ''} ${step.id ? 'cursor-pointer' : ''}`}
      onClick={step.id ? () => onRunDemo(step.id as string) : undefined}
    >
      <div className='flex items-center gap-3'>
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
          {isExecuted ? (
            <Icon name={step.iconPath?.id as never} className="!text-[#4ade80]" size={18} />
          ) : isActive ? (
            <Icon name={step.iconPath?.id as never} className="!text-blue-400" size={18} />
          ) : isNext ? (
            <Icon name={step.iconPath?.id as never} className="!text-[#FFD23F]" size={18} />
          ) : (
            <Icon name={step.iconPath?.id as never} className="!text-gray-500" size={18} />
          )}
        </div>
        <span
          className={`font-medium text-base ${isActive
            ? 'text-blue-300 font-semibold'
            : isNext
              ? 'text-white font-semibold'
              : isExecuted
                ? 'text-gray-400'
                : 'text-gray-200'
            }`}
        >
          {step.originalLabel}
        </span>

        {isNext && <span className="text-[#FFD23F]/70"> (next)</span>}

        {
          step.id && (
            <Icon name={`play`} className={`${isActive ? 'text-blue-400' : isExecuted ? 'text-gray-400' : 'text-gray-200'} ml-auto`} size={16} />
          )
        }
      </div>

      {
        (updatedDescription) && (
          <p className={`ml-8 pl-3 text-sm ${isActive ? 'text-blue-200' : isNext ? 'text-white' : isExecuted ? 'text-gray-500' : 'text-gray-400'}`}>
            {updatedDescription}
          </p>
        )
      }
    </div>
  );
};
