import * as React from 'react';
import { BaseShapeProps } from '../../models';
import { BaseShapeComponent } from './BaseShapeComponent';

export interface ISquareProps extends BaseShapeProps {
  fillColor?: string;
}

export const Square: React.FunctionComponent<ISquareProps> = ({
  x1,
  y1,
  x2,
  y2,
  lineColor = 'black',
  lineWidth = 1,
  fillColor = 'none'
}: React.PropsWithChildren<ISquareProps>) => {
  return (
    <rect
      x={Math.min(x1, x2)}
      y={Math.min(y1, y2)}
      width={Math.abs(x2 - x1)}
      height={Math.abs(y2 - y1)}
      stroke={lineColor}
      strokeWidth={lineWidth}
      fill={fillColor}
    />
  );
};

class SquareComponent extends BaseShapeComponent {
  render() {
    if (this.rootElm) {
      const props: ISquareProps = {
        x1: Number(this.getAttribute('x1')) || 0,
        y1: Number(this.getAttribute('y1')) || 0,
        x2: Number(this.getAttribute('x2')) || 100,
        y2: Number(this.getAttribute('y2')) || 100,
        lineColor: this.getAttribute('line-color') || 'black',
        lineWidth: Number(this.getAttribute('line-width')) || 1,
        fillColor: this.getAttribute('fill-color') || 'none'
      };

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
          <Square {...props} />
        </svg>
      );
    }
  }
}

customElements.define('dt-square', SquareComponent);