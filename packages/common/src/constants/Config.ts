export const Config = {
  title: 'Demo Time',
  root: 'demoTime',
  debug: 'debug',
  secrets: {
    engageTime: {
      apiKey: 'engageTimeApiKey',
    },
  },
  presentationMode: {
    previousEnabled: 'previousEnabled',
  },
  zoom: 'zoomLevel',
  highlight: {
    borderColor: 'highlightBorderColor',
    background: 'highlightBackground',
    blur: 'highlightBlur',
    opacity: 'highlightOpacity',
    zoom: 'highlightZoomEnabled',
  },
  clock: {
    show: 'showClock',
    timer: 'timer',
  },
  insert: {
    /**
     * @deprecated Use `insertTypingSpeed` instead.
     */
    speed: 'lineInsertionDelay',
    typingMode: 'insertTypingMode',
    typingSpeed: 'insertTypingSpeed',
    hackerTyperChunkSize: 'hackerTyperChunkSize',
  },
  api: {
    enabled: 'api.enabled',
    port: 'api.port',
  },
  slides: {
    customTheme: 'customTheme',
    slideHeaderTemplate: 'slideHeaderTemplate',
    slideFooterTemplate: 'slideFooterTemplate',
  },
  webcomponents: {
    scripts: 'customWebComponents',
  },
  demoRunner: {
    nextActionBehaviour: 'nextActionBehaviour',
  },
  defaultFileType: 'defaultFileType',
  configEditor: {
    openInConfigEditor: 'openInConfigEditor',
  },
  remote: {
    showScreenshot: 'remote.showScreenshot',
    showNotes: 'remote.showNotes',
  },
};
