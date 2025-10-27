export interface ThemeConfig {
  name: string;
  
  // Global colors
  color: string;
  background: string;
  headingColor: string;
  headingBackground: string;
  fontSize: string;
  
  // Links
  linkColor: string;
  linkActiveColor: string;
  
  // Blockquote
  blockquoteBorder: string;
  blockquoteBackground: string;
  
  // Layout-specific configs
  layouts: {
    default: LayoutConfig;
    intro: LayoutConfig;
    quote: LayoutConfig;
    section: LayoutConfig;
    imageLeft: LayoutConfig;
    imageRight: LayoutConfig;
    twoColumns: LayoutConfig;
  };
}

export interface LayoutConfig {
  background: string;
  color: string;
  headingColor: string;
  headingBackground: string;
}

export type SlideLayout =
  | 'default'
  | 'intro'
  | 'quote'
  | 'section'
  | 'image'
  | 'imageLeft'
  | 'imageRight'
  | 'twoColumns'
  | 'video';

export const DEFAULT_THEME: ThemeConfig = {
  name: 'custom',
  color: '#1e293b',
  background: '#ffffff',
  headingColor: '#0f172a',
  headingBackground: 'transparent',
  fontSize: '1.1em',
  linkColor: '#3b82f6',
  linkActiveColor: '#2563eb',
  blockquoteBorder: '#3b82f6',
  blockquoteBackground: 'rgba(59, 130, 246, 0.05)',
  layouts: {
    default: {
      background: '#ffffff',
      color: '#1e293b',
      headingColor: '#0f172a',
      headingBackground: 'transparent',
    },
    intro: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#ffffff',
      headingColor: '#ffffff',
      headingBackground: 'transparent',
    },
    quote: {
      background: '#f8fafc',
      color: '#1e293b',
      headingColor: '#3b82f6',
      headingBackground: 'transparent',
    },
    section: {
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: '#ffffff',
      headingColor: '#ffffff',
      headingBackground: 'transparent',
    },
    imageLeft: {
      background: '#ffffff',
      color: '#1e293b',
      headingColor: '#0f172a',
      headingBackground: 'transparent',
    },
    imageRight: {
      background: '#ffffff',
      color: '#1e293b',
      headingColor: '#0f172a',
      headingBackground: 'transparent',
    },
    twoColumns: {
      background: '#ffffff',
      color: '#1e293b',
      headingColor: '#0f172a',
      headingBackground: 'transparent',
    },
  },
};
