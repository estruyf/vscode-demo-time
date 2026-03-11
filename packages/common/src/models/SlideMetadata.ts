import { SlideLayout, SlideTheme, SlideTransition } from '../constants';

export type ControlPosition = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'none';

export interface SlideMetadata {
  theme?: SlideTheme;
  layout?: SlideLayout;
  transition?: SlideTransition;
  customTheme?: string;
  customLayout?: string;
  header?: string;
  footer?: string;
  autoAdvanceAfter?: number;
  image?: string;
  video?: string;
  controls?: boolean;

  // Animated SVG specific properties
  svgFile?: string;
  animationSpeed?: number | string;
  textTypeWriterEffect?: boolean;
  textTypeWriterSpeed?: number | string;
  autoplay?: boolean;
  showCompleteDiagram?: boolean;
  invertLightAndDarkColours?: boolean;
  controlsPosition?: ControlPosition;

  [key: string]: any;
}
