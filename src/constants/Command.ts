export const EXTENSION_NAME = "demo-time";

export const COMMAND = {
  // Running the demo
  start: `${EXTENSION_NAME}.start`,
  runStep: `${EXTENSION_NAME}.runStep`,
  runById: `${EXTENSION_NAME}.runById`,
  togglePresentationMode: `${EXTENSION_NAME}.togglePresentationMode`,
  reset: `${EXTENSION_NAME}.reset`,
  // Creator
  initialize: `${EXTENSION_NAME}.initialize`,
  openDemoFile: `${EXTENSION_NAME}.openDemoFile`,
  addToStep: `${EXTENSION_NAME}.addToStep`,
  stepMoveUp: `${EXTENSION_NAME}.stepMoveUp`,
  stepMoveDown: `${EXTENSION_NAME}.stepMoveDown`,
  // Output
  showOutputChannel: `${EXTENSION_NAME}.showOutputChannel`,
  // Panel view
  collapseAll: `${EXTENSION_NAME}.collapseAll`,
};
