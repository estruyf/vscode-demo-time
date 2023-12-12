import { TextDocument, Uri, workspace } from "vscode";
import { parseWinPath } from "../utils";
import { DemoPanel } from "../panels/DemoPanel";

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
      if (fileName.includes(".demo")) {
        shouldUpdate = true;
      }
    });

    if (shouldUpdate) {
      DemoPanel.update();
    }
  }

  private static checkToUpdate(document: TextDocument) {
    const fileName = parseWinPath(document.fileName);
    if (fileName.includes(".demo")) {
      DemoPanel.update();
    }
  }
}