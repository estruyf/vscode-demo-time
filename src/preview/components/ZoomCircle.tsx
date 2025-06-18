import * as React from 'react';

export interface IZoomCircleProps {
  mousePosition: { x: number; y: number } | null;
  isVisible: boolean;
  circleWidth: number;
  scale: number;
}

export const ZoomCircle: React.FunctionComponent<IZoomCircleProps> = ({
  mousePosition,
  isVisible,
  circleWidth,
  scale
}: React.PropsWithChildren<IZoomCircleProps>) => {
  if (!isVisible || !mousePosition) {
    return null;
  }

  const scaledCircleWidth = circleWidth * scale;
  const left = (mousePosition.x * scale) - (scaledCircleWidth / 2);
  const top = (mousePosition.y * scale) - (scaledCircleWidth / 2);

  return (
    <div
      className="zoom-circle"
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${scaledCircleWidth}px`,
        height: `${scaledCircleWidth}px`,
        borderRadius: '50%',
        border: '3px solid rgba(255, 255, 255, 0.9)',
        boxShadow: '0 0 15px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.2)',
        pointerEvents: 'none',
        zIndex: 1000,
        background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 70%, transparent 100%)',
        backdropFilter: 'brightness(1.5) contrast(1.2) saturate(1.3)',
        WebkitBackdropFilter: 'brightness(1.5) contrast(1.2) saturate(1.3)',
        transition: 'all 0.1s ease-out'
      }}
    />
  );
};