export interface IDemoTimeSettings {
  defaultFileType: string;
  openInConfigEditor: boolean;
  hideEditorActions: boolean;
  debug: boolean;
  previousEnabled: boolean;
  nextActionBehaviour: string;
  presentationViewToggles: string[];
  showClock: boolean;
  timer: number | null;
  nextSceneButtonText: string;
  highlightBorderColor: string;
  highlightBackground: string;
  highlightBlur: number;
  highlightOpacity: number;
  highlightZoomEnabled: boolean | number;
  zoom: number;
  insertTypingMode: string;
  insertTypingSpeed: number;
  insertTypingSpeedRandomness: number;
  hackerTyperChunkSize: number;
  terminalCommandBoundaryDelay: number;
  customTheme: string;
  customWebComponents: string[];
  slideHeaderTemplate: string;
  slideFooterTemplate: string;
  presentationTitle: string;
  slideProgressBar: string;
  slidePreviewSync: boolean;
  slideReducedMotion: string;
  'pdfExport.notes': string;
  'pdfExport.includeHiddenSlides': boolean;
  'videoExport.command': string;
  'videoExport.extension': string;
  'api.enabled': boolean;
  'api.port': number;
  'remote.showScreenshot': boolean;
  'remote.showNotes': boolean;
  engageTimeApiKey: string;
  'recording.captureSaves': boolean;
  'analytics.enabled': boolean;
  'redaction.enabled': boolean;
  'redaction.customPatterns': string[];
}

/**
 * The data of the settings view: the current values and the defaults of the settings
 */
export interface ISettingsViewData {
  settings: IDemoTimeSettings;
  defaults: Partial<IDemoTimeSettings>;
}
