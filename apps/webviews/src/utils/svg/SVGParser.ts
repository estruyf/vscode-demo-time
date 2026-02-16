/**
 * SVGParser
 * Parse SVG XML and extract elements and directives for animation
 */

import { DirectiveParser } from './DirectiveParser';
import { PathLengthCalculator } from './PathLengthCalculator';
import {
  ParsedSVG,
  SVGElementNode,
  SVGElementType,
  AnimationDirective,
  BoundingBox,
  ViewBox,
  ParseError,
} from './types';

export class SVGParser {
  private static MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static MAX_ELEMENTS = 10000;
  private static MAX_NESTING_DEPTH = 50;

  /**
   * Parse SVG content into structured data for animation
   */
  public static parse(svgContent: string): ParsedSVG {
    const errors: ParseError[] = [];

    // Check file size
    if (svgContent.length > this.MAX_FILE_SIZE) {
      throw new Error(
        `SVG file too large (${(svgContent.length / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`
      );
    }

    // Strip dangerous content
    const sanitized = this.sanitizeSVG(svgContent);

    // Parse XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, 'image/svg+xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error(`SVG parse error: ${parseError.textContent}`);
    }

    const svgRoot = doc.documentElement as unknown as SVGSVGElement;

    if (!svgRoot || svgRoot.tagName.toLowerCase() !== 'svg') {
      throw new Error('Invalid SVG: root element must be <svg>');
    }

    // Extract elements and directives
    const { elements, directives } = this.extractElementsAndDirectives(svgRoot);

    // Check element count
    if (elements.length > this.MAX_ELEMENTS) {
      errors.push({
        type: 'structure',
        message: `Too many elements (${elements.length}). Maximum is ${this.MAX_ELEMENTS}. Consider simplifying the SVG.`,
      });
    }

    // Calculate bounding box
    const boundingBox = this.calculateBoundingBox(svgRoot);

    // Get viewBox
    const viewBox = this.getViewBox(svgRoot, boundingBox);

    return {
      elements,
      directives,
      boundingBox,
      viewBox,
      errors,
    };
  }

  /**
   * Sanitize SVG content to remove dangerous elements
   */
  private static sanitizeSVG(svgContent: string): string {
    // Remove DOCTYPE declarations (can contain entity definitions)
    let sanitized = svgContent.replace(/<!DOCTYPE[^>]*>/gi, '');

    // Remove script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    return sanitized;
  }

  /**
   * Extract drawable elements and directives from SVG
   */
  private static extractElementsAndDirectives(
    svgRoot: SVGSVGElement
  ): { elements: SVGElementNode[]; directives: AnimationDirective[] } {
    const elements: SVGElementNode[] = [];
    const directives: AnimationDirective[] = [];

    // Traverse the SVG tree and extract elements in document order
    const traverse = (node: Node, depth: number = 0, inheritedAttrs: Map<string, string> = new Map()): void => {
      if (depth > this.MAX_NESTING_DEPTH) {
        console.warn(`Max nesting depth exceeded at ${depth}, skipping deeper elements`);
        return;
      }

      // Process comment nodes for directives
      if (node.nodeType === Node.COMMENT_NODE) {
        const directive = DirectiveParser.parse(node as Comment, elements.length);
        if (directive) {
          directives.push(directive);
        }
        return;
      }

      // Process element nodes
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();

        // Handle groups - collect attributes and traverse children
        if (tagName === 'g' || tagName === 'svg') {
          // Inherit attributes from parent and add group's own attributes
          const groupAttrs = new Map(inheritedAttrs);
          
          // Collect inheritable attributes from this group
          const inheritableAttrs = ['transform', 'opacity', 'fill', 'stroke', 'stroke-width', 
                                     'stroke-opacity', 'fill-opacity', 'stroke-linecap', 
                                     'stroke-linejoin', 'stroke-dasharray'];
          
          for (const attrName of inheritableAttrs) {
            const value = element.getAttribute(attrName);
            if (value !== null) {
              // Combine transforms if both parent and child have them
              if (attrName === 'transform' && groupAttrs.has('transform')) {
                groupAttrs.set('transform', `${groupAttrs.get('transform')} ${value}`);
              } else {
                groupAttrs.set(attrName, value);
              }
            }
          }
          
          for (const child of Array.from(element.childNodes)) {
            traverse(child, depth + 1, groupAttrs);
          }
          return;
        }

        // Extract drawable elements
        if (this.isDrawableElement(element)) {
          const svgElement = element as SVGElement;
          const elementNode = this.createElementNode(svgElement, elements.length, inheritedAttrs);
          elements.push(elementNode);
        }

        // Also traverse children of drawable elements (e.g., <text> with <tspan>)
        for (const child of Array.from(element.childNodes)) {
          traverse(child, depth + 1, inheritedAttrs);
        }
      }
    };

    traverse(svgRoot);

    return { elements, directives };
  }

  /**
   * Check if element is a drawable SVG element
   */
  private static isDrawableElement(element: Element): boolean {
    const drawableTags = [
      'path',
      'line',
      'polyline',
      'polygon',
      'rect',
      'circle',
      'ellipse',
      'text',
      'image',
    ];
    return drawableTags.includes(element.tagName.toLowerCase());
  }

  /**
   * Create element node from SVG element
   */
  private static createElementNode(
    element: SVGElement, 
    order: number, 
    inheritedAttrs: Map<string, string> = new Map()
  ): SVGElementNode {
    const type = element.tagName.toLowerCase() as SVGElementType;
    
    // Apply inherited attributes to element if not already present
    for (const [attrName, attrValue] of inheritedAttrs) {
      if (!element.hasAttribute(attrName)) {
        element.setAttribute(attrName, attrValue);
      }
    }

    const stroke = element.getAttribute('stroke');
    const fill = element.getAttribute('fill');

    const hasStroke = stroke !== null && stroke !== 'none';
    const hasFill = fill !== 'none' && (fill !== null || type !== 'path'); // paths default to no fill

    // Calculate path length
    let pathLength: number | undefined;
    if (element instanceof SVGPathElement) {
      pathLength = PathLengthCalculator.calculate(element);
    } else if (hasStroke) {
      pathLength = PathLengthCalculator.approximateShapeLength(element);
    }

    // Extract text content
    let textContent: string | undefined;
    if (type === 'text') {
      textContent = element.textContent || '';
    }

    // Get all attributes (including inherited ones now applied)
    const attributes: Record<string, string | null> = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = attr.value;
    }

    return {
      element,
      type,
      order,
      hasStroke,
      hasFill,
      pathLength,
      textContent,
      attributes,
    };
  }

  /**
   * Calculate bounding box of all SVG content
   */
  private static calculateBoundingBox(svgRoot: SVGSVGElement): BoundingBox {
    try {
      // First try to get the viewBox attribute if it exists
      const viewBox = svgRoot.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.split(/\s+/);
        if (parts.length === 4) {
          return {
            x: parseFloat(parts[0]),
            y: parseFloat(parts[1]),
            width: parseFloat(parts[2]),
            height: parseFloat(parts[3]),
          };
        }
      }

      // Fallback to getBBox() if viewBox not present
      // Note: getBBox() may fail if SVG is not in the DOM
      const bbox = svgRoot.getBBox();
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
      };
    } catch (error) {
      console.warn('[SVGParser] Failed to calculate bounding box, using fallback:', error);
      return { x: 0, y: 0, width: 800, height: 600 };
    }
  }

  /**
   * Get viewBox from SVG element
   */
  private static getViewBox(svgRoot: SVGSVGElement, fallbackBbox: BoundingBox): ViewBox {
    const viewBoxAttr = svgRoot.getAttribute('viewBox');
    if (viewBoxAttr) {
      const parts = viewBoxAttr.split(/\s+/);
      if (parts.length === 4) {
        return {
          x: parseFloat(parts[0]),
          y: parseFloat(parts[1]),
          width: parseFloat(parts[2]),
          height: parseFloat(parts[3]),
        };
      }
    }

    // Use bounding box as fallback
    return { ...fallbackBbox };
  }
}
