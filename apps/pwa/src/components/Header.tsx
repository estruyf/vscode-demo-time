import * as React from 'react';
import { useApi } from '../hooks/useApi';

export interface IHeaderProps { }

export const Header: React.FunctionComponent<IHeaderProps> = () => {
  const {
    disconnect,
  } = useApi();

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
          <button
            onClick={disconnect}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};
