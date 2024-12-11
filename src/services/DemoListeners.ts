import { TextDocument, Uri, workspace } from "vscode";
import { parseWinPath } from "../utils";
import { DemoPanel } from "../panels/DemoPanel";
import { Config, General } from "../constants";
import { DecoratorService } from "./DecoratorService";
import { DemoRunner } from "./DemoRunner";
import { DemoStatusBar } from "./DemoStatusBar";

export class DemoListeners {
  public static register() {
    workspace.onDidSaveTextDocument(DemoListeners.checkToUpdate);
    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(Config.root)) {
        DecoratorService.register();
        DemoRunner.allowPrevious();
        DemoStatusBar.showTimer();
      }
    });

    workspace.onDidCreateFiles((e) => DemoListeners.checkMultipleToUpdate(e.files || []));
    workspace.onDidDeleteFiles((e) => DemoListeners.checkMultipleToUpdate(e.files || []));
  }

  private static checkMultipleToUpdate(documents: readonly Uri[]) {
    let shouldUpdate = false;

    documents.forEach((file) => {
      const fileName = parseWinPath(file.path);
      if (fileName.includes(General.demoFolder)) {
        shouldUpdate = true;
      }
    });

    if (shouldUpdate) {
      DemoPanel.update();
    }
  }

  private static checkToUpdate(document: TextDocument) {
    const fileName = parseWinPath(document.fileName);
    if (fileName.includes(General.demoFolder)) {
      DemoPanel.update();
    }
  }
}
