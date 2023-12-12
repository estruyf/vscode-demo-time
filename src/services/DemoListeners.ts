import { TextDocument, Uri, workspace } from "vscode";
import { parseWinPath } from "../utils";
import { DemoPanel } from "../panels/DemoPanel";
import { General } from "../constants";

export class DemoListeners {
  public static register() {
    workspace.onDidSaveTextDocument(DemoListeners.checkToUpdate);

    workspace.onDidCreateFiles((e) =>
      DemoListeners.checkMultipleToUpdate(e.files || [])
    );
    workspace.onDidDeleteFiles((e) =>
      DemoListeners.checkMultipleToUpdate(e.files || [])
    );
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
