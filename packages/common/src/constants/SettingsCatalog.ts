import type { IDemoTimeSettings } from '../models/IDemoTimeSettings';

export type SettingCategoryId =
  | 'general'
  | 'presenting'
  | 'highlighting'
  | 'typing'
  | 'slides'
  | 'export'
  | 'remote'
  | 'engagetime'
  | 'recording'
  | 'privacy';

export interface SettingCategory {
  id: SettingCategoryId;
  title: string;
  description: string;
}

export type SettingControl =
  | 'boolean'
  | 'number'
  | 'text'
  | 'select'
  | 'path'
  | 'pathList'
  | 'stringList'
  | 'color'
  | 'viewToggles'
  | 'highlightZoom'
  | 'secret';

export interface SettingOption {
  value: string;
  label: string;
  description?: string;
}

export interface SettingDefinition {
  /**
   * The key without the `demoTime.` prefix
   */
  key: keyof IDemoTimeSettings;
  label: string;
  description: string;
  category: SettingCategoryId;
  control: SettingControl;
  options?: SettingOption[];
  min?: number;
  max?: number;
  step?: number;
  /**
   * Unit shown after a number input, like `ms` or `min`
   */
  unit?: string;
  placeholder?: string;
  /**
   * File types for the file picker of `path` and `pathList` controls
   */
  fileTypes?: string[];
  /**
   * Machine scoped settings are only read from the user settings, so they are saved there
   */
  userSettings?: boolean;
  /**
   * Stored in the VS Code secret storage instead of the settings
   */
  secret?: boolean;
}

export const SETTING_CATEGORIES: SettingCategory[] = [
  {
    id: 'general',
    title: 'General',
    description: 'Act files and the Demo Time editor',
  },
  {
    id: 'presenting',
    title: 'Presenting',
    description: 'Presentation mode, navigation and the clock',
  },
  {
    id: 'highlighting',
    title: 'Highlight & zoom',
    description: 'How highlighted code and zoom moves look',
  },
  {
    id: 'typing',
    title: 'Typing & terminal',
    description: 'How text is typed in the editor and the terminal',
  },
  {
    id: 'slides',
    title: 'Slides',
    description: 'Themes, components, headers, footers and the slide preview',
  },
  {
    id: 'export',
    title: 'Export',
    description: 'PDF and video export',
  },
  {
    id: 'remote',
    title: 'Remote control & API',
    description: 'Control Demo Time from outside VS Code',
  },
  {
    id: 'engagetime',
    title: 'EngageTime',
    description: 'Sessions and polls with your audience',
  },
  {
    id: 'recording',
    title: 'Recording & analytics',
    description: 'Recording demos and presentation analytics',
  },
  {
    id: 'privacy',
    title: 'Privacy',
    description: 'Mask sensitive values while presenting',
  },
];

/**
 * The settings in the Demo Time settings view. Every setting in the `contributes.configuration` of
 * the extension must be listed here, or in `SETTINGS_NOT_IN_VIEW`.
 */
export const SETTINGS_CATALOG: SettingDefinition[] = [
  // General
  {
    key: 'defaultFileType',
    label: 'Default file type',
    description: 'The format of new act files.',
    category: 'general',
    control: 'select',
    options: [
      { value: 'json', label: 'JSON' },
      { value: 'yaml', label: 'YAML' },
    ],
  },
  {
    key: 'openInConfigEditor',
    label: 'Open act files in the act editor',
    description: 'Open act files in the visual act editor instead of the text editor.',
    category: 'general',
    control: 'boolean',
  },
  {
    key: 'hideEditorActions',
    label: 'Hide editor actions',
    description: 'Hide the Demo Time actions in the editor title bar.',
    category: 'general',
    control: 'boolean',
  },
  {
    key: 'debug',
    label: 'Debug mode',
    description: 'Write extra information to the Demo Time output channel.',
    category: 'general',
    control: 'boolean',
  },

  // Presenting
  {
    key: 'previousEnabled',
    label: 'Enable the previous command',
    description: 'Go back to the previous scene with the previous command in presentation mode.',
    category: 'presenting',
    control: 'boolean',
  },
  {
    key: 'nextActionBehaviour',
    label: 'Next scene',
    description: 'Which scene the next command runs.',
    category: 'presenting',
    control: 'select',
    options: [
      {
        value: 'lastExecuted',
        label: 'After the last executed scene',
        description: 'Continue after the scene that ran last.',
      },
      {
        value: 'currentPosition',
        label: 'After the selected scene',
        description: 'Continue after the scene selected in the Acts & Scenes view.',
      },
    ],
  },
  {
    key: 'presentationViewToggles',
    label: 'Presentation view hides',
    description: 'The parts of VS Code that the presentation view hides.',
    category: 'presenting',
    control: 'viewToggles',
    options: [
      { value: 'statusBar', label: 'Status bar' },
      { value: 'tabs', label: 'Tabs' },
      { value: 'activityBar', label: 'Activity bar' },
      { value: 'sideBar', label: 'Side bar' },
      { value: 'secondarySideBar', label: 'Secondary side bar (Chat)' },
      { value: 'panel', label: 'Panel' },
    ],
  },
  {
    key: 'showClock',
    label: 'Show clock',
    description: 'Show a clock in the status bar.',
    category: 'presenting',
    control: 'boolean',
  },
  {
    key: 'timer',
    label: 'Countdown timer',
    description: 'How long the session lasts. Leave empty for no countdown.',
    category: 'presenting',
    control: 'number',
    min: 0,
    unit: 'min',
    placeholder: 'No timer',
  },

  // Highlighting
  {
    key: 'highlightBorderColor',
    label: 'Border color',
    description: 'The border around highlighted code.',
    category: 'highlighting',
    control: 'color',
  },
  {
    key: 'highlightBackground',
    label: 'Background color',
    description: 'The background of highlighted code.',
    category: 'highlighting',
    control: 'color',
  },
  {
    key: 'highlightOpacity',
    label: 'Opacity of other code',
    description: 'The opacity of the code that isn’t highlighted. 1 keeps it fully visible.',
    category: 'highlighting',
    control: 'number',
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'highlightBlur',
    label: 'Blur of other code',
    description: 'Blur the code that isn’t highlighted. 0 turns it off.',
    category: 'highlighting',
    control: 'number',
    min: 0,
    step: 1,
    unit: 'px',
  },
  {
    key: 'highlightZoomEnabled',
    label: 'Zoom when highlighting',
    description: 'Zoom in on the editor when a move highlights code.',
    category: 'highlighting',
    control: 'highlightZoom',
    min: 1,
    max: 10,
  },
  {
    key: 'zoom',
    label: 'Zoom steps of zoom moves',
    description: 'How many steps the `zoomIn` and `zoomOut` moves zoom the VS Code window.',
    category: 'highlighting',
    control: 'number',
    min: 1,
    step: 1,
  },

  // Typing
  {
    key: 'insertTypingMode',
    label: 'Typing mode',
    description: 'How moves that insert text add it to the editor.',
    category: 'typing',
    control: 'select',
    options: [
      { value: 'instant', label: 'Instant', description: 'Insert all text at once.' },
      { value: 'line-by-line', label: 'Line by line', description: 'Insert one line at a time.' },
      {
        value: 'character-by-character',
        label: 'Character by character',
        description: 'Type one character at a time.',
      },
      {
        value: 'hacker-typer',
        label: 'Hacker typer',
        description: 'Type a chunk of characters on every key press.',
      },
    ],
  },
  {
    key: 'insertTypingSpeed',
    label: 'Typing speed',
    description: 'The delay between characters or lines.',
    category: 'typing',
    control: 'number',
    min: 0,
    unit: 'ms',
  },
  {
    key: 'insertTypingSpeedRandomness',
    label: 'Typing speed randomness',
    description:
      'Adds up to this percentage of random extra delay per character, so typing feels less robotic. 0 turns it off.',
    category: 'typing',
    control: 'number',
    min: 0,
    max: 100,
    unit: '%',
  },
  {
    key: 'hackerTyperChunkSize',
    label: 'Hacker typer chunk size',
    description: 'The number of characters typed on every key press in hacker typer mode.',
    category: 'typing',
    control: 'number',
    min: 1,
  },
  {
    key: 'terminalCommandBoundaryDelay',
    label: 'Delay between terminal commands',
    description:
      'Increase it when terminal commands overlap, for example with a custom shell prompt like Oh My Posh, Starship or Powerlevel10k.',
    category: 'typing',
    control: 'number',
    min: 0,
    unit: 'ms',
  },

  // Slides
  {
    key: 'customTheme',
    label: 'Custom theme',
    description: 'A CSS file with your own slide theme.',
    category: 'slides',
    control: 'path',
    fileTypes: ['.css'],
    placeholder: 'Path to a CSS file',
  },
  {
    key: 'customWebComponents',
    label: 'Custom web components',
    description: 'JavaScript files with web components to use in your slides.',
    category: 'slides',
    control: 'pathList',
    fileTypes: ['.js', '.cjs', '.mjs'],
    placeholder: 'Path to a JavaScript file',
  },
  {
    key: 'slideHeaderTemplate',
    label: 'Header template',
    description:
      'An HTML file with Handlebars placeholders, shown as the header of every slide. A slide can override it with the `header` front matter property.',
    category: 'slides',
    control: 'path',
    fileTypes: ['.html', '.hbs'],
    placeholder: 'Path to an HTML file',
  },
  {
    key: 'slideFooterTemplate',
    label: 'Footer template',
    description:
      'An HTML file with Handlebars placeholders, shown as the footer of every slide. A slide can override it with the `footer` front matter property.',
    category: 'slides',
    control: 'path',
    fileTypes: ['.html', '.hbs'],
    placeholder: 'Path to an HTML file',
  },
  {
    key: 'presentationTitle',
    label: 'Presentation title',
    description:
      'The value of the `{{presentationTitle}}` placeholder in header and footer templates.',
    category: 'slides',
    control: 'text',
    placeholder: 'Name of the workspace folder',
  },
  {
    key: 'slideProgressBar',
    label: 'Progress bar',
    description:
      'Show a thin progress bar on the slides. A slide can change it with the `progress` front matter property.',
    category: 'slides',
    control: 'select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'top', label: 'Top' },
      { value: 'bottom', label: 'Bottom' },
    ],
  },
  {
    key: 'slidePreviewSync',
    label: 'Sync the slide preview with the editor',
    description:
      'Show the slide under the editor cursor in the slide preview, and double-click a slide to reveal its source. Never applies in presentation mode.',
    category: 'slides',
    control: 'boolean',
  },
  {
    key: 'slideReducedMotion',
    label: 'Reduced motion',
    description:
      'Replace slide transitions with a short crossfade and show animations in their end state. Auto follows the `workbench.reduceMotion` setting of VS Code and your OS.',
    category: 'slides',
    control: 'select',
    options: [
      { value: 'auto', label: 'Auto', description: 'Follow VS Code and the OS' },
      { value: 'on', label: 'On', description: 'Always reduce motion' },
      { value: 'off', label: 'Off', description: 'Always animate' },
    ],
  },

  // Export
  {
    key: 'pdfExport.notes',
    label: 'Speaker notes in the PDF',
    description: 'Add the `<!-- notes -->` blocks of the slides to the PDF export.',
    category: 'export',
    control: 'select',
    options: [
      { value: 'none', label: 'Leave out' },
      { value: 'below', label: 'Below each slide' },
      { value: 'page', label: 'On a separate page after each slide' },
    ],
  },
  {
    key: 'pdfExport.includeHiddenSlides',
    label: 'Include hidden slides in the PDF',
    description: 'Export the slides with `hide: true` in their front matter.',
    category: 'export',
    control: 'boolean',
  },
  {
    key: 'videoExport.command',
    label: 'Video export command',
    description:
      'The command that runs the video export CLI. Point it at another build, for example `node /path/to/apps/video/dist/cli.js`.',
    category: 'export',
    control: 'text',
    userSettings: true,
  },
  {
    key: 'videoExport.extension',
    label: 'Demo Time build for video export',
    description:
      'A Marketplace id (with @version) or the path to a VSIX to record with. Leave empty to use the version you are running.',
    category: 'export',
    control: 'text',
    placeholder: 'The version you are running',
    userSettings: true,
  },

  // Remote control & API
  {
    key: 'api.enabled',
    label: 'Enable the API',
    description: 'Control Demo Time from outside VS Code, for example with the remote control.',
    category: 'remote',
    control: 'boolean',
  },
  {
    key: 'api.port',
    label: 'API port',
    description: 'The port of the API server.',
    category: 'remote',
    control: 'number',
    min: 1,
    max: 65535,
  },
  {
    key: 'remote.showScreenshot',
    label: 'Screenshots in the remote control',
    description: 'Show a screenshot of the current slide or editor in the remote control.',
    category: 'remote',
    control: 'boolean',
  },
  {
    key: 'remote.showNotes',
    label: 'Notes in the remote control',
    description: 'Show the notes of the current scene or slide in the remote control.',
    category: 'remote',
    control: 'boolean',
  },
  // EngageTime
  {
    key: 'engageTimeApiKey',
    label: 'EngageTime API key',
    description: 'Used for the EngageTime moves. It is stored in the VS Code secret storage.',
    category: 'engagetime',
    control: 'secret',
    placeholder: 'Enter your EngageTime API key',
    secret: true,
  },

  // Recording & analytics
  {
    key: 'recording.captureSaves',
    label: 'Record file saves',
    description: 'Add a `save` move when you save a file while recording a demo.',
    category: 'recording',
    control: 'boolean',
  },
  {
    key: 'analytics.enabled',
    label: 'Presentation analytics',
    description: 'Track timing and navigation while presenting, for the analytics dashboard.',
    category: 'recording',
    control: 'boolean',
  },

  // Privacy
  {
    key: 'redaction.enabled',
    label: 'Redaction',
    description:
      'Mask sensitive values like API keys, tokens, passwords and email addresses in the editor during presentation mode.',
    category: 'privacy',
    control: 'boolean',
  },
  {
    key: 'redaction.customPatterns',
    label: 'Custom redaction patterns',
    description: 'Extra regular expressions for values to mask, like `CUSTOM_SECRET_[A-Za-z0-9]+`.',
    category: 'privacy',
    control: 'stringList',
    placeholder: 'Regular expression',
  },
];

/**
 * Settings of the extension that the settings view leaves out on purpose
 */
export const SETTINGS_NOT_IN_VIEW: string[] = [
  // Deprecated, replaced by `insertTypingSpeed`
  'lineInsertionDelay',
  // Written by the "Export play as video" command
  'videoExport.options',
];
