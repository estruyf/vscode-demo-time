import { Extension } from ".";
import { getSetting, isProjectInitialized } from "../utils";
import { Config, StateKeys } from "../constants";
import { ConfigurationTarget, window, workspace } from "vscode";

export class VersionValidation {
  public static async pathCheck(): Promise<void> {
    const isInitialized = await isProjectInitialized();
    if (!isInitialized) {
      return;
    }

    const relativeFromWorkspace = await getSetting(Config.relativeFromWorkspace);
    if (!relativeFromWorkspace) {
      return;
    }

    const ext = Extension.getInstance();
    const hasBeenAsked = ext.getState<boolean>(StateKeys.versions.v2);
    if (hasBeenAsked) {
      return;
    }

    const choice = await window.showInformationMessage(
      "Demo Time v2 - Breaking Change",
      {
        modal: true,
        detail:
          "Demo Time v2 changed the way it handles paths in your demo files. The new approach is that all paths are relative to the workspace root folder, instead of the `.demo` folder for content files, notes, etc. This change makes it easier to configure your demos.\n\nIn case you want to keep the old approach, you can do so by changing the setting `demoTime.relativeFromWorkspace` to `false`.\n\nDo you want to use the new approach?",
      },
      "Use New Approach",
      "Stick to Old Approach"
    );

    ext.setState(StateKeys.versions.v2, true);

    if (choice === "Stick to Old Approach") {
      await workspace.getConfiguration().update("demoTime.relativeFromWorkspace", false, ConfigurationTarget.Workspace);
    }
  }
}
