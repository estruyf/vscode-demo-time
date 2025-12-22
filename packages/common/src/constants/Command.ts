export const EXTENSION_NAME = 'demo-time';

export const COMMAND = {
  // Pro features
  authenticate: `${EXTENSION_NAME}.authenticate`,
  // Documentation
  documentation: `${EXTENSION_NAME}.docs`,
  // Demo file actions
  addStepToDemo: `${EXTENSION_NAME}.addStepToDemo`,
  // Running the demo
  start: `${EXTENSION_NAME}.start`,
  previous: `${EXTENSION_NAME}.previous`,
  runStep: `${EXTENSION_NAME}.runStep`,
  runById: `${EXTENSION_NAME}.runById`,
  togglePresentationMode: `${EXTENSION_NAME}.togglePresentationMode`,
  reset: `${EXTENSION_NAME}.reset`,
  toggleHighlight: `${EXTENSION_NAME}.toggleHighlight`,
  toggleSelectionHighlight: `${EXTENSION_NAME}.toggleSelectionHighlight`,
  continueDemo: `${EXTENSION_NAME}.continueDemo`,
  // Creator
  initialize: `${EXTENSION_NAME}.initialize`,
  openDemoFile: `${EXTENSION_NAME}.openDemoFile`,
  addToStep: `${EXTENSION_NAME}.addToStep`,
  stepMoveUp: `${EXTENSION_NAME}.stepMoveUp`,
  stepMoveDown: `${EXTENSION_NAME}.stepMoveDown`,
  viewStep: `${EXTENSION_NAME}.viewStep`,
  createSnapshot: `${EXTENSION_NAME}.createSnapshot`,
  createPatch: `${EXTENSION_NAME}.createPatch`,
  createDemoFile: `${EXTENSION_NAME}.createDemoFile`,
  // Output
  showOutputChannel: `${EXTENSION_NAME}.showOutputChannel`,
  // Panel view
  collapseAll: `${EXTENSION_NAME}.collapseAll`,
  treeviewFind: `${EXTENSION_NAME}.treeviewFind`,
  // Countdown
  startCountdown: `${EXTENSION_NAME}.startCountdown`,
  resetCountdown: `${EXTENSION_NAME}.resetCountdown`,
  pauseCountdown: `${EXTENSION_NAME}.pauseCountdown`,
  // Presenter view
  showPresenterView: `${EXTENSION_NAME}.showPresenterView`,
  // Notes
  viewNotes: `${EXTENSION_NAME}.viewNotes`,
  // Slides
  createSlide: `${EXTENSION_NAME}.createSlide`,
  viewSlide: `${EXTENSION_NAME}.viewSlide`,
  openSlidePreview: `${EXTENSION_NAME}.openSlidePreview`,
  togglePresentationView: `${EXTENSION_NAME}.togglePresentationView`,
  closePresentationView: `${EXTENSION_NAME}.closePresentationView`,
  exportToPdf: `${EXTENSION_NAME}.exportToPdf`,
  // Importer
  importPowerPointImages: `${EXTENSION_NAME}.importPowerPointImages`,
  // Config editor
  openConfigInTextEditor: `${EXTENSION_NAME}.openConfigInTextEditor`,
  openConfigEditor: `${EXTENSION_NAME}.openConfigEditor`,
  // Hacker Typer
  hackerTyperNextChunk: `${EXTENSION_NAME}.hackerTyperNextChunk`,
  // Settings
  showSettings: `${EXTENSION_NAME}.showSettings`,
  // Overview
  showOverview: `${EXTENSION_NAME}.showOverview`,
  // Resources
  openSupportTheProject: `${EXTENSION_NAME}.openSupportTheProject`,
  openRemoteControl: `${EXTENSION_NAME}.openRemoteControl`,
  openPowerPointAddin: `${EXTENSION_NAME}.openPowerPointAddin`,
};
