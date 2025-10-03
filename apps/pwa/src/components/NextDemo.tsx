import React, { useState } from 'react';
import { NextDemo as NextDemoType } from '../types/api';
import { Icon } from 'vscrui';

interface NextDemoProps {
  nextDemo?: NextDemoType;
  previousEnabled?: boolean;
  loading: boolean;
  onTriggerNext: (bringToFront?: boolean) => Promise<void>;
  onTriggerPrevious: (bringToFront?: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const NextDemo: React.FC<NextDemoProps> = ({
  nextDemo,
  previousEnabled,
  loading,
  onTriggerNext,
  onTriggerPrevious,
  onRefresh,
}) => {
  const [bringToFront, setBringToFront] = useState(false);

  const handleTriggerNext = async () => {
    try {
      await onTriggerNext(bringToFront);
      setTimeout(() => onRefresh(), 500);
    } catch (error) {
      console.error('Failed to trigger next demo:', error);
    }
  };

  const handleTriggerPrevious = async () => {
    try {
      await onTriggerPrevious(bringToFront);
      setTimeout(() => onRefresh(), 500);
    } catch (error) {
      console.error('Failed to trigger previous demo:', error);
    }
  };

  return (
    <div className="flex-shrink-0 bg-[#1a1f2e]/95 backdrop-blur-sm border-t border-gray-700/30 shadow-2xl">
      <div className="container mx-auto md:px-4 md:py-3 max-w-4xl">
        {nextDemo && (
          <div className="px-3 py-2 mb-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">NEXT UP</p>
              <p className="font-semibold text-white text-sm leading-tight">{nextDemo.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="bringToFrontToggle" className="text-xs text-gray-400 whitespace-nowrap">
                Bring to front
              </label>
              <div className="relative">
                <input
                  type="checkbox"
                  id="bringToFrontToggle"
                  checked={bringToFront}
                  onChange={(e) => setBringToFront(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500 cursor-pointer"
                  onClick={() => setBringToFront(!bringToFront)}
                ></div>
              </div>
            </div>
          </div>
        )}

        {!nextDemo && (
          <div className="px-3 py-2 mb-2 flex items-center justify-end">
            <div className="flex items-center gap-2">
              <label htmlFor="bringToFrontToggle" className="text-xs text-gray-400 whitespace-nowrap">
                Bring to front
              </label>
              <div className="relative">
                <input
                  type="checkbox"
                  id="bringToFrontToggle"
                  checked={bringToFront}
                  onChange={(e) => setBringToFront(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#FFD23F] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FFD23F] cursor-pointer"
                  onClick={() => setBringToFront(!bringToFront)}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between md:gap-x-4">
          {
            previousEnabled && (
              <button
                onClick={handleTriggerPrevious}
                disabled={loading}
                className="btn-secondary border-0 text-base py-4 disabled:opacity-50 disabled:cursor-not-allowed rounded-none md:rounded-lg w-1/2"
              >
                <span className='inline-flex items-center'><Icon name="arrow-left" size={16} className='mr-2' /> Previous</span>
              </button>
            )
          }

          <button
            onClick={handleTriggerNext}
            disabled={loading}
            className={`btn-primary text-base py-4 disabled:opacity-50 disabled:cursor-not-allowed rounded-none md:rounded-lg ${previousEnabled ? 'w-1/2' : 'w-full'}`}
          >
            {loading ? 'Starting...' : nextDemo ?
              (
                <span className='inline-flex items-center'>Next <Icon name="arrow-right" size={16} className='ml-2' /></span>
              ) : (
                <span className='inline-flex items-center'><Icon name="rocket" size={16} className='mr-2' /> Start</span>
              )
            }
          </button>
        </div>
      </div>
    </div>
  );
};
