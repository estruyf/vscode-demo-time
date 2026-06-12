import * as React from 'react';
import { Clock as ClockType } from '../types/api';
import { ClockIcon, Pause, Timer } from 'lucide-react';

export interface ClockProps {
  clock?: ClockType;
}

export const Clock: React.FunctionComponent<ClockProps> = ({ clock }) => {
  if (!clock) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="text-center flex flex-row font-mono font-bold">
          <div className={`flex items-center ${clock.isPaused ? 'text-yellow-400' : 'text-white'}`}>
            <ClockIcon className="inline w-4 h-4 mr-1" />
            <span>{clock.current}</span>
          </div>

          {clock.countdown && (
            <div className={`inline-flex items-center ml-4 ${clock.isPaused
              ? 'text-yellow-400'
              : clock.countdown.startsWith('-')
                ? 'text-red-500'
                : 'text-green-400'
              }`}>
              {clock.isPaused ? (<Pause className="inline w-4 h-4 mr-1" />) : (<Timer className="inline w-4 h-4 mr-1" />)}
              <span>{clock.countdown}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
