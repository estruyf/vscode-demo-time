/**
 * PathLengthCalculator
 * Calculate path lengths for animation timing
 */

export class PathLengthCalculator {
  /**
   * Calculate total length of a path element
   */
  public static calculate(pathElement: SVGPathElement): number {
    try {
      // Use native getTotalLength() for accurate path length
      return pathElement.getTotalLength();
    } catch (error) {
      console.warn('Failed to calculate path length:', error);
      return 0;
    }
  }

  /**
   * Approximate length for non-path shapes
   */
  public static approximateShapeLength(element: SVGElement): number {
    const tag = element.tagName.toLowerCase();

    if (tag === 'rect') {
      const width = parseFloat(element.getAttribute('width') || '0');
      const height = parseFloat(element.getAttribute('height') || '0');
      return 2 * (width + height); // Perimeter
    }

    if (tag === 'circle') {
      const r = parseFloat(element.getAttribute('r') || '0');
      return 2 * Math.PI * r; // Circumference
    }

    if (tag === 'ellipse') {
      const rx = parseFloat(element.getAttribute('rx') || '0');
      const ry = parseFloat(element.getAttribute('ry') || '0');
      // Ramanujan's approximation for ellipse perimeter
      const h = Math.pow((rx - ry), 2) / Math.pow((rx + ry), 2);
      return Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
    }

    if (tag === 'line') {
      const x1 = parseFloat(element.getAttribute('x1') || '0');
      const y1 = parseFloat(element.getAttribute('y1') || '0');
      const x2 = parseFloat(element.getAttribute('x2') || '0');
      const y2 = parseFloat(element.getAttribute('y2') || '0');
      return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    if (tag === 'polyline' || tag === 'polygon') {
      const points = parsePointsAttribute(element.getAttribute('points') || '');
      let length = 0;
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        length += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      }
      // For polygon, add distance from last to first point
      if (tag === 'polygon' && points.length > 0) {
        const first = points[0];
        const last = points[points.length - 1];
        length += Math.sqrt(Math.pow(first.x - last.x, 2) + Math.pow(first.y - last.y, 2));
      }
      return length;
    }

    // Default fallback
    return 100;
  }
}

/**
 * Parse SVG points attribute string into array of {x, y} objects.
 * Handles both comma-separated and space-separated formats.
 */
function parsePointsAttribute(pointsStr: string): { x: number; y: number }[] {
  const numbers = pointsStr.trim().split(/[\s,]+/).map(Number);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    points.push({ x: numbers[i], y: numbers[i + 1] });
  }
  return points;
}
