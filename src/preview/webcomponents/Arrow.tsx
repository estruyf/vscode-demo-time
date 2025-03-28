import * as React from 'react';
import { BaseShapeComponent } from './BaseShapeComponent';
import { ArrowHeadType, BaseShapeProps } from '../../models';

export interface IArrowProps extends BaseShapeProps {
  arrowHead?: ArrowHeadType;
}

export const Arrow: React.FunctionComponent<IArrowProps> = ({
  x1,
  y1,
  x2,
  y2,
  lineColor = 'black',
  lineWidth = 1,
  arrowHead = 'end'
}: React.PropsWithChildren<IArrowProps>) => {
  const arrowSize = lineWidth * 4;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

  // Calculate adjusted endpoints to prevent line from overlapping with arrowheads
  const arrowOffset = arrowSize * 0.9; // Slightly smaller than arrowSize to ensure clean connection
  const startOffset = (arrowHead === 'start' || arrowHead === 'both') ? arrowOffset : 0;
  const endOffset = (arrowHead === 'end' || arrowHead === 'both') ? arrowOffset : 0;

  const adjustedX1 = x1 + (startOffset * Math.cos(angle));
  const adjustedY1 = y1 + (startOffset * Math.sin(angle));
  const adjustedX2 = x2 - (endOffset * Math.cos(angle));
  const adjustedY2 = y2 - (endOffset * Math.sin(angle));

  const createArrowHead = (x: number, y: number, isStart: boolean) => {
    const baseAngle = isStart ? angle + Math.PI : angle;

    return `
      M ${x},${y}
      L ${x - arrowSize * Math.cos(baseAngle - Math.PI / 6)},${y - arrowSize * Math.sin(baseAngle - Math.PI / 6)}
      L ${x - arrowSize * Math.cos(baseAngle + Math.PI / 6)},${y - arrowSize * Math.sin(baseAngle + Math.PI / 6)}
      Z
    `;
  };

  // Only draw the line if there's enough space between arrowheads
  const showLine = distance > ((arrowHead === 'both' ? arrowOffset * 2 : arrowOffset));

  return (
    <g stroke={lineColor} fill={lineColor}>
      {showLine && (
        <line
          x1={adjustedX1}
          y1={adjustedY1}
          x2={adjustedX2}
          y2={adjustedY2}
          strokeWidth={lineWidth}
        />
      )}
      {(arrowHead === 'end' || arrowHead === 'both') && (
        <path d={createArrowHead(x2, y2, false)} />
      )}
      {(arrowHead === 'start' || arrowHead === 'both') && (
        <path d={createArrowHead(x1, y1, true)} />
      )}
    </g>
  );
};

class ArrowComponent extends BaseShapeComponent {
  render() {
    if (this.rootElm) {
      const props: IArrowProps = {
        x1: Number(this.getAttribute('x1')) || 0,
        y1: Number(this.getAttribute('y1')) || 0,
        x2: Number(this.getAttribute('x2')) || 100,
        y2: Number(this.getAttribute('y2')) || 100,
        lineColor: this.getAttribute('line-color') || 'black',
        lineWidth: Number(this.getAttribute('line-width')) || 1,
        arrowHead: (this.getAttribute('arrow-head') as ArrowHeadType) || 'end'
      };

      // Set the SVG to match the slide dimensions (960x540)
      this.rootElm.render(
        <svg
          width="960"
          height="540"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none'
          }}
        >
          <Arrow {...props} />
        </svg>
      );
    }
  }
}

customElements.define('dt-arrow', ArrowComponent);