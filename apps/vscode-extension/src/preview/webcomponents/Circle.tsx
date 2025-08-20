import * as React from 'react';
import { BaseShapeProps } from '../../models';
import { BaseShapeComponent } from './BaseShapeComponent';

export interface ICircleProps extends BaseShapeProps {
  fillColor?: string;
}

export const Circle: React.FunctionComponent<ICircleProps> = ({
  x1,
  y1,
  x2,
  y2,
  lineColor = 'black',
  lineWidth = 1,
  fillColor = 'none'
}: React.PropsWithChildren<ICircleProps>) => {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const rx = Math.abs(x2 - x1) / 2;
  const ry = Math.abs(y2 - y1) / 2;

  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      stroke={lineColor}
      strokeWidth={lineWidth}
      fill={fillColor}
    />
  );
};

class CircleComponent extends BaseShapeComponent {
  render() {
    if (this.rootElm) {
      const props: ICircleProps = {
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
          <Circle {...props} />
        </svg>
      );
    }
  }
}

customElements.define('dt-circle', CircleComponent);