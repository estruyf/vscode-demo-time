/**
 * Scaling Utility
 * Calculate scaling and letterboxing for SVG to fit 960x540 slide dimensions
 */

import { BoundingBox, ViewBox } from '../../types/svg';

export interface ScaledViewBox extends ViewBox {
  scale: number;
}

/**
 * Calculate scaling to fit SVG into target size while maintaining aspect ratio
 */
export function calculateScaling(
  boundingBox: BoundingBox,
  targetSize: { width: number; height: number },
): ScaledViewBox {
  if (boundingBox.width === 0 || boundingBox.height === 0) {
    throw new Error(
      `Cannot scale zero-size bounding box: ${boundingBox.width}x${boundingBox.height}`,
    );
  }

  const sourceAspect = boundingBox.width / boundingBox.height;
  const targetAspect = targetSize.width / targetSize.height;

  let scale: number;
  let offsetX = 0;
  let offsetY = 0;

  if (sourceAspect > targetAspect) {
    // Source is wider - letterbox top/bottom
    scale = targetSize.width / boundingBox.width;
    const scaledHeight = boundingBox.height * scale;
    offsetY = (targetSize.height - scaledHeight) / 2 / scale;
  } else {
    // Source is taller - pillarbox left/right
    scale = targetSize.height / boundingBox.height;
    const scaledWidth = boundingBox.width * scale;
    offsetX = (targetSize.width - scaledWidth) / 2 / scale;
  }

  return {
    x: boundingBox.x - offsetX,
    y: boundingBox.y - offsetY,
    width: targetSize.width / scale,
    height: targetSize.height / scale,
    scale,
  };
}
