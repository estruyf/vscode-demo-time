import { SlideLayout, SlideTheme, SlideTransition } from "../constants";

export interface SlideMetadata {
  theme?: SlideTheme;
  layout?: SlideLayout;
  transition?: SlideTransition;
  customTheme?: string;
  customLayout?: string;

  [key: string]: any;
}
