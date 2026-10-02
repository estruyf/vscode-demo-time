import { SlideLayout } from './SlideLayout';
import { SlideTheme } from './SlideTheme';
import { SlideTransition } from './SlideTransition';

export type SlidePropertyType = 'string' | 'boolean' | 'number' | 'enum' | 'file' | 'template';

export interface SlideProperty {
  type: SlidePropertyType;
  /**
   * The allowed values of an `enum` property
   */
  values?: readonly string[];
  /**
   * Compare the values of an `enum` property without case
   */
  ignoreCase?: boolean;
  /**
   * A `file` property that can also be an `http(s)` URL
   */
  allowUrl?: boolean;
}

/**
 * The front matter properties that Demo Time reads from a slide. Other properties are only used
 * when a custom layout, header or footer template reads them.
 */
export const SLIDE_PROPERTIES: Record<string, SlideProperty> = {
  theme: { type: 'enum', values: Object.values(SlideTheme) },
  layout: { type: 'enum', values: Object.values(SlideLayout) },
  transition: { type: 'enum', values: Object.values(SlideTransition) },
  customTheme: { type: 'file', allowUrl: true },
  customLayout: { type: 'file' },
  header: { type: 'template' },
  footer: { type: 'template' },
  progress: { type: 'enum', values: ['true', 'false', 'top', 'bottom'], ignoreCase: true },
  title: { type: 'string' },
  date: { type: 'string' },
  slideTitle: { type: 'string' },
  sceneTitle: { type: 'string' },
  actTitle: { type: 'string' },
  presentationTitle: { type: 'string' },
  autoAdvanceAfter: { type: 'number' },
  hide: { type: 'boolean' },
  autoFit: { type: 'boolean' },
  image: { type: 'file', allowUrl: true },
  // Video layout
  video: { type: 'file', allowUrl: true },
  controls: { type: 'boolean' },
  autoplay: { type: 'boolean' },
  autoPlay: { type: 'boolean' },
  loop: { type: 'boolean' },
  muted: { type: 'boolean' },
  playsInline: { type: 'boolean' },
  playbackRate: { type: 'number' },
  // Animated SVG layout
  svgFile: { type: 'file' },
  animationSpeed: { type: 'number' },
  textTypeWriterEffect: { type: 'boolean' },
  textTypeWriterSpeed: { type: 'number' },
  skipAnimation: { type: 'boolean' },
  invertLightAndDarkColours: { type: 'boolean' },
  controlsPosition: {
    type: 'enum',
    values: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'none'],
  },
};
