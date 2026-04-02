/**
 * SVGRenderer Component
 * Renders SVG with proper scaling to 960x540 dimensions
 */

import React, { useEffect, useState } from 'react';
import { ParsedSVG } from '../../types/svg';
import { AnimationState } from '../../utils/svg/AnimationEngine';
import { calculateScaling, ScaledViewBox } from '../../utils/svg/scaling';
import { buildColorMap } from '../../utils/svg/colorInversion';
import { AnimatedElement } from './AnimatedElement';

export interface SVGRendererProps {
  parsedSVG: ParsedSVG;
  animationState: AnimationState | null;
  showComplete: boolean;
  invertColors?: boolean;
  className?: string;
}

export const SVGRenderer = React.forwardRef<SVGSVGElement, SVGRendererProps>(
  ({ parsedSVG, animationState, showComplete, invertColors = false, className = '' }, ref) => {
    const [scaledViewBox, setScaledViewBox] = useState<ScaledViewBox | null>(null);
    const [colorMap, setColorMap] = useState<Map<string, string> | undefined>(undefined);

    // Calculate scaling for 960x540
    useEffect(() => {
      const scaled = calculateScaling(parsedSVG.boundingBox, { width: 960, height: 540 });
      setScaledViewBox(scaled);
    }, [parsedSVG.boundingBox]);

    // Build color inversion map
    useEffect(() => {
      if (invertColors) {
        const map = buildColorMap(parsedSVG.elements);
        setColorMap(map);
      } else {
        setColorMap(undefined);
      }
    }, [invertColors, parsedSVG.elements]);

    if (!scaledViewBox) {
      return <div className="flex items-center justify-center w-full h-full">Loading...</div>;
    }

    const viewBoxValue = `${scaledViewBox.x} ${scaledViewBox.y} ${scaledViewBox.width} ${scaledViewBox.height}`;

    // Set canvas background: white by default (SVGs assume white), black when inverted
    const svgStyle: React.CSSProperties = {
      background: invertColors ? '#000000' : '#FFFFFF',
    };

    return (
      <div
        className={`flex items-center justify-center w-full h-full ${className}`}
        style={{
          width: '960px',
          height: '540px',
        }}
      >
        <svg
          ref={ref}
          viewBox={viewBoxValue}
          width={960}
          height={540}
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
          style={svgStyle}
        >
          {parsedSVG.elements.map((node, index) => {
            const isVisible = showComplete || (animationState?.visibleElements.has(index) ?? false);
            const isCurrent = animationState?.currentElementIndex === index;
            const progress = isCurrent ? (animationState?.currentProgress ?? 0) : 0;

            return (
              <AnimatedElement
                key={index}
                node={node}
                isVisible={isVisible}
                isCurrent={isCurrent}
                progress={progress}
                colorMap={colorMap}
              />
            );
          })}
        </svg>
      </div>
    );
  }
);

SVGRenderer.displayName = 'SVGRenderer';
