import * as React from 'react';

export interface ILaserPointerProps {
  x: number;
  y: number;
  visible: boolean;
}

export const LaserPointer: React.FunctionComponent<ILaserPointerProps> = ({
  x,
  y,
  visible
}: React.PropsWithChildren<ILaserPointerProps>) => {
  if (!visible) {
    return null;
  }

  return (
    <div
      className="laser-pointer"
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: '#ff0000',
        boxShadow: '0 0 10px #ff0000, 0 0 20px #ff0000, 0 0 30px #ff0000',
        pointerEvents: 'none',
        zIndex: 1000,
        transform: 'translate(-50%, -50%)',
        animation: 'pulse 1s infinite'
      }}
    >
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
};