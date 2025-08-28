export interface IDemoTimeSettings {
  defaultFileType: string;
  previousEnabled: boolean;
  highlightBorderColor: string;
  highlightBackground: string;
  highlightBlur: number;
  highlightOpacity: number;
  highlightZoomEnabled: boolean | number;
  showClock: boolean;
  timer: number;
  insertTypingMode: string;
  insertTypingSpeed: number;
  hackerTyperChunkSize: number;
  'api.enabled': boolean;
  'api.port': number;
  customTheme: string;
  slideHeaderTemplate: string;
  slideFooterTemplate: string;
  customWebComponents: string[];
  nextActionBehaviour: string;
  openInConfigEditor: boolean;
  engageTimeApiKey: string;
}
