/**
 * AnimatedElement Component
 * Renders a single SVG element with animation support
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
import { SVGElementNode, SVGExtendedElement, SvgPropValue } from '../../types/svg';

export interface AnimatedElementProps {
  node: SVGElementNode;
  isVisible: boolean;
  isCurrent: boolean;
  progress: number; // 0-1, animation progress for current element
  colorMap?: Map<string, string>; // For color inversion
}

export const AnimatedElement: React.FC<AnimatedElementProps> = React.memo(({
  node,
  isVisible,
  isCurrent,
  progress,
  colorMap,
}) => {
  const elementRef = useRef<SVGExtendedElement>(null);
  const [fillVisible, setFillVisible] = useState(false);

  // Reset fill visibility when element stops being visible
  useEffect(() => {
    if (!isVisible) {
      setFillVisible(false);
    }
  }, [isVisible]);

  // Apply stroke animation
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !isCurrent || !node.hasStroke || !node.pathLength) {
      return;
    }

    // Use getTotalLength() on the rendered DOM element for pixel-perfect values,
    // falling back to the pre-calculated pathLength from the parser
    let pathLength = node.pathLength;
    try {
      if (typeof element.getTotalLength === 'function') {
        pathLength = element.getTotalLength();
      }
    } catch {
      // keep fallback
    }
    const dashOffset = pathLength * (1 - progress);

    element.style.strokeDasharray = `${pathLength}`;
    element.style.strokeDashoffset = `${dashOffset}`;

    // When stroke animation completes, show fill
    if (progress >= 0.99 && node.hasFill) {
      setFillVisible(true);
    }
  }, [isCurrent, progress, node.hasStroke, node.pathLength, node.hasFill]);

  // Reset stroke after animation completes
  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    // Element is visible but no longer current - animation complete
    if (isVisible && !isCurrent) {
      // Clear stroke animation for completed elements
      if (node.hasStroke && node.pathLength) {
        element.style.strokeDasharray = '';
        element.style.strokeDashoffset = '';
      }

      // Ensure fill is visible for completed elements (stroke or no stroke)
      if (node.hasFill) {
        setFillVisible(true);
      }
    }
  }, [isVisible, isCurrent, node.hasStroke, node.pathLength, node.hasFill]);

  // Handle elements with only fill (no stroke)
  useEffect(() => {
    if (isCurrent && !node.hasStroke && node.hasFill) {
      // Instant fill for elements without stroke
      setFillVisible(true);
    }
  }, [isCurrent, node.hasStroke, node.hasFill]);

  // Apply color inversion
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !colorMap) {
      return;
    }

    // Helper to extract color from node attributes or inline style
    const extractColor = (attrName: 'fill' | 'stroke'): string | null => {
      // 1. Check parsed node attributes (from SVGParser)
      const raw = (node.attributes && node.attributes[attrName]) as string | undefined;
      if (raw && raw !== 'none') {
        return raw;
      }

      // 2. Check style attribute on the original node (string)
      const rawStyle = (node.attributes && node.attributes['style']) as string | undefined;
      if (rawStyle) {
        const parsed = parseInlineStyle(rawStyle);
        if (parsed && parsed[attrName]) {
          return parsed[attrName];
        }
      }

      // 3. Check the rendered element's inline style
      const inline = element.style && element.style[attrName];
      if (inline && inline !== 'none') {
        return inline;
      }

      // 4. Fallback to attribute on element (may be set by React props)
      const attr = element.getAttribute(attrName);
      if (attr && attr !== 'none') {
        return attr;
      }

      return null;
    };

    const applyColor = (attrName: 'fill' | 'stroke') => {
      const color = extractColor(attrName);
      if (!color) { return; }
      const mapped = colorMap.get(color);
      if (mapped) {
        try {
          element.setAttribute(attrName, mapped);
          // also set inline style to ensure visibility when originally set via style
          element.style[attrName] = mapped;
        } catch {
          // ignore if attribute can't be set on this element
        }
      }
    };

    applyColor('fill');
    applyColor('stroke');
  }, [colorMap, node.attributes]);

  // Clone element and render - memoize to prevent recreation
  const elementProps = useMemo(() => {
    const tagName = node.element.tagName.toLowerCase();
    const attributes = getElementAttributes(node.element);

    // Detect simple <tspan>-only text so we can strip text content from React render and let
    // the DOM effect drive per-character updates without React re-inserting full text each render.
    let simpleTspans = false;
    if ((tagName === 'text' || tagName === 'tspan') && node.element.children && node.element.children.length > 0) {
      simpleTspans = Array.from(node.element.children).every((c) => c.tagName.toLowerCase() === 'tspan' && c.children.length === 0);
      if (simpleTspans) {
        const children: React.ReactNode[] = [];
        for (let i = 0; i < node.element.children.length; i++) {
          const child = node.element.children[i] as SVGElement;
          const childAttrs = getElementAttributes(child);
          // Strip text content so React doesn't write full text; DOM effect will manage textContent.
          const { children: _children, ...rest } = childAttrs as Record<string, unknown>;
          void _children;
          children.push(React.createElement(child.tagName.toLowerCase(), { ...rest, key: i }));
        }
        attributes.children = children;
      }
    }

    // Calculate visibility
    // Images and non-animatable elements show immediately when visible
    const isImageOrNonAnimatable = node.type === 'image' || node.type === 'text' ||
      (!node.hasStroke && !node.hasFill);

    const attributeStyle = (
      attributes.style && typeof attributes.style === 'object' && !Array.isArray(attributes.style)
        ? attributes.style as React.CSSProperties
        : undefined
    );

    // Use visibility instead of opacity to preserve stroke-opacity and fill-opacity attributes
    const style: React.CSSProperties = {
      ...(attributeStyle ?? {}),
      visibility: isVisible ? 'visible' : 'hidden',
    };

    // Preserve original fill/stroke opacity if present so toggling fill visibility doesn't lose intended opacity
    const originalFillOpacity = (() => {
      const v = attributes.fillOpacity ?? attributeStyle?.fillOpacity;
      const n = v !== undefined && v !== null ? parseFloat(String(v)) : NaN;
      return !isNaN(n) ? n : undefined;
    })();

    const originalStrokeOpacity = (() => {
      const v = attributes.strokeOpacity ?? attributeStyle?.strokeOpacity;
      const n = v !== undefined && v !== null ? parseFloat(String(v)) : NaN;
      return !isNaN(n) ? n : undefined;
    })();

    // For fill animation, control fill-opacity separately (but not for images/text)
    if (node.hasFill && !isImageOrNonAnimatable) {
      style.fillOpacity = fillVisible ? (originalFillOpacity !== undefined ? originalFillOpacity : 1) : 0;
      style.transition = fillVisible && !isCurrent ? 'fill-opacity 0.3s ease-in' : 'none';
    } else if (attributeStyle?.fillOpacity !== undefined) {
      // Ensure existing declared fill-opacity is preserved for non-animated cases
      style.fillOpacity = attributeStyle.fillOpacity;
    }

    // Preserve stroke opacity if present
    if (originalStrokeOpacity !== undefined) {
      style.strokeOpacity = originalStrokeOpacity;
    }

    // Set initial stroke-dash values during render to prevent a one-frame flash
    // where the stroke appears fully drawn before the useEffect sets the dash pattern.
    // The useEffect will override with getTotalLength() for pixel-perfect values.
    if (isCurrent && node.hasStroke && node.pathLength) {
      const dashOffset = node.pathLength * (1 - progress);
      style.strokeDasharray = `${node.pathLength}`;
      style.strokeDashoffset = `${dashOffset}`;
    }

    // Text typewriter handling: progressively reveal text for the current element
    if ((tagName === 'text' || tagName === 'tspan') && isCurrent && typeof progress === 'number' && progress >= 0 && progress < 1) {
      if (typeof attributes.children === 'string') {
        // Simple text: substring-based typewriter
        const fullText = attributes.children as string;
        const chars = Math.max(0, Math.floor(progress * fullText.length));
        attributes.children = fullText.slice(0, chars);
      } else if (simpleTspans) {
        // Simple tspans will be handled by the DOM-side effect; avoid clipPath/text replacement here.
      } else {
        // Text with complex children: use CSS clipPath to reveal left-to-right
        const clipPercent = (1 - progress) * 100;
        style.clipPath = `inset(0 ${clipPercent}% 0 0)`;
      }
    }

    return {
      tagName,
      attributes: {
        ...attributes,
        style,
      },
    };
  }, [node.element, isVisible, fillVisible, isCurrent, node.hasFill, node.hasStroke, node.pathLength, progress]);

  // DOM-driven typewriter for simple <tspan> children to ensure per-character updates.
  const origTspansRef = useRef<string[] | null>(null);
  useEffect(() => {
    const el = elementRef.current as HTMLElement | null;
    if (!el) { return; }
    const tag = (node.element && (node.element.tagName || '')).toLowerCase();
    if (!(tag === 'text' || tag === 'tspan')) { return; }

    const children = Array.from(el.children) as HTMLElement[];
    const simpleTspans = children.length > 0 && children.every(c => c.tagName.toLowerCase() === 'tspan' && c.children.length === 0);
    if (!simpleTspans) { return; }

    if (origTspansRef.current === null) {
      // Prefer the original parsed node's tspan text (not the rendered DOM, which we stripped).
      const sourceChildren = Array.from(node.element.children || []);
      const fromSource = sourceChildren.map(c => c.textContent || '');
      const fromDom = children.map(c => c.textContent || '');
      origTspansRef.current = fromSource.every(t => t.length === 0) ? fromDom : fromSource;
    }

    const orig = origTspansRef.current;
    const fullText = orig.join('');
    const charsToShow = Math.max(0, Math.floor(progress * fullText.length));

    let remaining = charsToShow;
    for (let i = 0; i < children.length; i++) {
      const part = orig[i];
      const take = Math.min(part.length, remaining);
      try {
        children[i].textContent = part.slice(0, take);
      } catch {
        // ignore DOM write errors
      }
      remaining -= take;
    }

    // Restore originals when no longer current or when finished
    if (!isCurrent || progress >= 1) {
      for (let i = 0; i < children.length; i++) {
        try {
          children[i].textContent = orig[i];
        } catch {
          // ignore DOM write errors
        }
      }
      origTspansRef.current = null;
    }
  }, [isCurrent, progress, node.element]);

  return React.createElement(elementProps.tagName, {
    ref: elementRef,
    ...elementProps.attributes,
  });
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.isCurrent === nextProps.isCurrent &&
    prevProps.progress === nextProps.progress &&
    prevProps.node === nextProps.node &&
    prevProps.colorMap === nextProps.colorMap
  );
});

AnimatedElement.displayName = 'AnimatedElement';

/**
 * Extract attributes from SVG element as React props
 */
function getElementAttributes(element: SVGElement): Record<string, SvgPropValue> {
  const attributes: Record<string, SvgPropValue> = {};
  const attrs = element.attributes;

  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    let name = attr.name;
    let value: SvgPropValue = attr.value;

    // Convert attribute names to React-friendly format
    if (name === 'class') {
      name = 'className';
    } else {
      // Convert kebab-case to camelCase for SVG attributes
      name = svgAttrToCamelCase(name);
    }

    // Parse style attribute
    if (name === 'style' && typeof value === 'string') {
      value = parseInlineStyle(value);
    }

    attributes[name] = value;
  }

  // Handle text content for text elements
  if (element.tagName === 'text' || element.tagName === 'tspan') {
    attributes.children = element.textContent;
  }

  // Handle child elements (like tspan in text)
  if (element.children.length > 0) {
    const children: React.ReactNode[] = [];
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i] as SVGElement;
      const childTag = child.tagName.toLowerCase();
      const childAttrs = getElementAttributes(child);
      children.push(React.createElement(childTag, { ...childAttrs, key: i }));
    }
    attributes.children = children;
  }

  return attributes;
}

/**
 * Convert SVG attribute name from kebab-case to camelCase for React
 */
function svgAttrToCamelCase(attrName: string): string {
  // Handle common XML namespace attributes explicitly
  const namespaceAttrs: Record<string, string> = {
    'xml:space': 'xmlSpace',
    'xml:lang': 'xmlLang',
    'xlink:href': 'xlinkHref',
    'xlink:title': 'xlinkTitle',
    'xlink:show': 'xlinkShow',
    'xlink:type': 'xlinkType',
  };

  if (namespaceAttrs[attrName]) {
    return namespaceAttrs[attrName];
  }

  // Handle other XML namespace attributes (xml:*, xlink:*)
  if (attrName.startsWith('xml:')) {
    return 'xml' + attrName.slice(4).charAt(0).toUpperCase() + attrName.slice(5);
  }
  if (attrName.startsWith('xlink:')) {
    return 'xlink' + attrName.slice(6).charAt(0).toUpperCase() + attrName.slice(7);
  }
  if (attrName.startsWith('xmlns:')) {
    return attrName; // Keep xmlns attributes as-is
  }

  // Common SVG attributes that need conversion
  const conversions: Record<string, string> = {
    'stroke-width': 'strokeWidth',
    'stroke-linecap': 'strokeLinecap',
    'stroke-linejoin': 'strokeLinejoin',
    'stroke-dasharray': 'strokeDasharray',
    'stroke-dashoffset': 'strokeDashoffset',
    'stroke-opacity': 'strokeOpacity',
    'fill-opacity': 'fillOpacity',
    'fill-rule': 'fillRule',
    'clip-path': 'clipPath',
    'clip-rule': 'clipRule',
    'font-family': 'fontFamily',
    'font-size': 'fontSize',
    'font-weight': 'fontWeight',
    'text-anchor': 'textAnchor',
    'text-decoration': 'textDecoration',
    'stop-color': 'stopColor',
    'stop-opacity': 'stopOpacity',
  };

  // Return mapped name if exists, otherwise convert using regex
  if (conversions[attrName]) {
    return conversions[attrName];
  }

  // Convert any other kebab-case to camelCase
  if (attrName.includes('-')) {
    return attrName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  return attrName;
}

/**
 * Parse inline style string to React style object
 */
function parseInlineStyle(styleString: string): Record<string, string> {
  const style: Record<string, string> = {};
  const declarations = styleString.split(';');

  for (const decl of declarations) {
    const [property, value] = decl.split(':').map(s => s.trim());
    if (property && value) {
      // Convert CSS property to camelCase for React
      const reactProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      style[reactProperty] = value;
    }
  }

  return style;
}
