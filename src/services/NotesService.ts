import { commands, Uri } from "vscode";
import { Subscription, Demo } from "../models";
import { Extension } from "./Extension";
import { COMMAND, General } from "../constants";
import { ActionTreeItem } from "../providers/ActionTreeviewProvider";
import { Notifications } from "./Notifications";
import { fileExists } from "../utils";

export class NotesService {
  public static registerCommands() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(
      commands.registerCommand(COMMAND.viewNotes, NotesService.viewNotes)
    );
  }

  public static async showNotes(demo: Demo) {
    if (demo.notes && demo.notes.file && demo.notes.show) {
      NotesService.openNotes(demo.notes.file);
    }
  }

  public static async openNotes(filePath: string) {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    const notesPath = workspaceFolder ? Uri.joinPath(workspaceFolder.uri, General.demoFolder, General.notesFolder, filePath) : undefined;
    const notesFile = notesPath ? await fileExists(notesPath) : false;
    if (!notesFile) {
      Notifications.error("No notes available for this step.");
      return;
    }

    commands.executeCommand("markdown.showPreviewToSide", notesPath);
  }

  private static async viewNotes(item: ActionTreeItem) {
    if (!item || !item.notes) {
      Notifications.error("No notes available for this step.");
      return;
    }
  
    NotesService.openNotes(item.notes);
  }
}