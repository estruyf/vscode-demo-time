import * as React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

export interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export const ZoomControls: React.FunctionComponent<ZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
}: React.PropsWithChildren<ZoomControlsProps>) => {
  return (
    <div className="absolute top-4 right-4 flex gap-2 z-10">
      <button
        onClick={onZoomOut}
        className="bg-[#FFD23F] hover:bg-[#FFC61A] text-black p-2 rounded-full transition-colors"
        title="Zoom Out"
      >
        <ZoomOut size={16} />
      </button>
      <button
        onClick={onZoomIn}
        className="bg-[#FFD23F] hover:bg-[#FFC61A] text-black p-2 rounded-full transition-colors"
        title="Zoom In"
      >
        <ZoomIn size={16} />
      </button>
    </div>
  );
};
