/**
 * Color Inversion Utility
 * Inverts lightness of colors using OKLCH color space via Culori
 */

import { converter, formatHex } from 'culori';
import { SVGElementNode } from './types';

const oklchConverter = converter('oklch');

/**
 * Invert the lightness of a color using OKLCH color space
 * This provides perceptually uniform inversion for dark theme compatibility
 */
export function invertLightness(color: string): string {
  if (!color || color === 'none' || color === 'transparent') {
    return color;
  }

  try {
    // Convert to OKLCH
    const oklch = oklchConverter(color);
    
    if (!oklch) {
      console.warn(`[ColorInversion] Failed to parse color: ${color}`);
      return color; // fallback to original
    }

    // Invert lightness (0-1 scale)
    const inverted = {
      ...oklch,
      l: 1 - oklch.l,
    };
    
    // Convert back to hex
    const hexColor = formatHex(inverted);
    return hexColor || color;
  } catch (error) {
    console.warn(`[ColorInversion] Error inverting color ${color}:`, error);
    return color;
  }
}

/**
 * Extract and invert all colors from SVG elements
 * Returns a map of original color -> inverted color
 */
export function buildColorMap(elements: SVGElementNode[]): Map<string, string> {
  const colorMap = new Map<string, string>();
  
  for (const node of elements) {
    const element = node.element;
    
    // Extract fill color
    const fillColor = element.getAttribute('fill');
    if (fillColor && !colorMap.has(fillColor) && !fillColor.startsWith('url(')) {
      colorMap.set(fillColor, invertLightness(fillColor));
    }
    
    // Extract stroke color
    const strokeColor = element.getAttribute('stroke');
    if (strokeColor && !colorMap.has(strokeColor) && !strokeColor.startsWith('url(')) {
      colorMap.set(strokeColor, invertLightness(strokeColor));
    }
    
    // Extract stop-color for gradients (check style attribute)
    const style = element.getAttribute('style');
    if (style) {
      const stopColorMatch = style.match(/stop-color:\s*([^;]+)/);
      if (stopColorMatch) {
        const stopColor = stopColorMatch[1].trim();
        if (!colorMap.has(stopColor)) {
          colorMap.set(stopColor, invertLightness(stopColor));
        }
      }
    }
    
    // Check for stop elements in gradients
    if (element.tagName === 'stop') {
      const stopColor = element.getAttribute('stop-color');
      if (stopColor && !colorMap.has(stopColor)) {
        colorMap.set(stopColor, invertLightness(stopColor));
      }
    }
  }
  
  return colorMap;
}

/**
 * Apply color inversion to an SVG element
 * Modifies the element's fill and stroke attributes with inverted colors
 */
export function applyColorInversion(
  element: SVGElement,
  colorMap: Map<string, string>
): void {
  // Invert fill
  const fill = element.getAttribute('fill');
  if (fill && colorMap.has(fill)) {
    element.setAttribute('fill', colorMap.get(fill)!);
  }
  
  // Invert stroke
  const stroke = element.getAttribute('stroke');
  if (stroke && colorMap.has(stroke)) {
    element.setAttribute('stroke', colorMap.get(stroke)!);
  }
  
  // Invert stop-color in style attribute
  const style = element.getAttribute('style');
  if (style) {
    let newStyle = style;
    colorMap.forEach((inverted, original) => {
      newStyle = newStyle.replace(
        new RegExp(`stop-color:\\s*${escapeRegExp(original)}`, 'g'),
        `stop-color: ${inverted}`
      );
    });
    if (newStyle !== style) {
      element.setAttribute('style', newStyle);
    }
  }
  
  // Invert stop-color attribute
  if (element.tagName === 'stop') {
    const stopColor = element.getAttribute('stop-color');
    if (stopColor && colorMap.has(stopColor)) {
      element.setAttribute('stop-color', colorMap.get(stopColor)!);
    }
  }
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
