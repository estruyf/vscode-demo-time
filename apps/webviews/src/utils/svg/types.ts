/**
 * SVG Animation Types
 * Type definitions for animated SVG diagram feature
 */

export type SVGElementType =
  | 'path'
  | 'line'
  | 'polyline'
  | 'polygon'
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'text'
  | 'image';

export interface SVGElementNode {
  element: SVGElement;
  type: SVGElementType;
  order: number;
  hasStroke: boolean;
  hasFill: boolean;
  pathLength?: number;
  textContent?: string;
  attributes: Record<string, string | null>;
}

export interface AnimationDirective {
  type: 'speed' | 'pause' | 'pauseUntilPlay';
  position: number; // element index to apply before
  value?: number; // speed multiplier or pause duration in ms
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParseError {
  type: 'parse' | 'structure' | 'unsupported';
  message: string;
  line?: number;
  element?: string;
}

export interface ParsedSVG {
  elements: SVGElementNode[];
  directives: AnimationDirective[];
  boundingBox: BoundingBox;
  viewBox: ViewBox;
  errors: ParseError[];
}

export interface AnimationConfig {
  baseSpeed: number; // pixels per second
  textTypewriterEffect: boolean;
  textTypewriterSpeed: number; // ms per character
  autoplay: boolean;
  showCompleteDiagram: boolean;
}

export interface AnimationState {
  currentElementIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  isComplete: boolean;
  visibleElements: Set<number>;
  waitingForUser: boolean;
}
