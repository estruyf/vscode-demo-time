import { commands, workspace } from "vscode";
import { Extension } from "../services";
import { StateKeys } from "../constants";
import { updateConfig } from "./updateConfig";

export const togglePresentationView = async (enable?: boolean) => {
  const config = workspace.getConfiguration();
  const statusBar = "workbench.statusBar.visible";
  const tabs = "workbench.editor.showTabs";
  const activityBar = "workbench.activityBar.location";

  const statusBarValue = config.get(statusBar);
  const tabsValue = config.get(tabs);
  const activityBarValue = config.get(activityBar);

  let previousValues = {
    statusBar: statusBarValue,
    tabs: tabsValue,
    activityBar: activityBarValue,
  };

  // If these values are set, it means that the presentation view is enabled
  const isPresentationViewEnabled = statusBarValue === false && tabsValue === "none" && activityBarValue === "hidden";

  if (isPresentationViewEnabled) {
    previousValues =
      Extension.getInstance().getState<typeof previousValues>(StateKeys.presentationView) || previousValues;
  } else {
    await Extension.getInstance().setState(StateKeys.presentationView, previousValues);
  }

  const showGetEnabled = (!isPresentationViewEnabled && typeof enable === "undefined") || enable === true;

  if (showGetEnabled) {
    await commands.executeCommand("workbench.action.closeSidebar");
    await commands.executeCommand("workbench.action.closePanel");
  }

  await updateConfig(statusBar, showGetEnabled ? false : previousValues?.statusBar || undefined);
  await updateConfig(tabs, showGetEnabled ? "none" : previousValues?.tabs || undefined);
  await updateConfig(activityBar, showGetEnabled ? "hidden" : previousValues?.activityBar || undefined);
  return;
};
