import * as React from 'react';
import { Clock } from './Clock';
import { Clock as IClock } from '../types/api';

export interface IHeaderProps {
  clock?: IClock;
  onDisconnect?: () => void;
}

export const Header: React.FunctionComponent<IHeaderProps> = ({ clock, onDisconnect }) => {
  return (
    <div className="sticky top-0 z-10 bg-[#202736]/95 backdrop-blur-sm border-b border-gray-700/30 flex-shrink-0">
      <div className="container mx-auto px-4 py-3 max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Demo Time" className="w-10 h-10" />
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">
                Demo Time
              </h1>
              <p className="text-xs text-gray-400 leading-tight">
                Remote
              </p>
            </div>
          </div>

          <div className='hidden md:block'>
            <Clock clock={clock} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onDisconnect}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
