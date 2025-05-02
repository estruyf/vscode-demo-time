import { commands, Uri } from "vscode";
import { Subscription, Demo } from "../models";
import { Extension } from "./Extension";
import { COMMAND, Config, General } from "../constants";
import { ActionTreeItem } from "../providers/ActionTreeviewProvider";
import { Notifications } from "./Notifications";
import { fileExists, getSetting } from "../utils";
import { FileProvider } from "./FileProvider";
import { DemoRunner } from "./DemoRunner";

export class NotesService {
  public static registerCommands() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(commands.registerCommand(COMMAND.viewNotes, NotesService.viewNotes));
  }

  public static async showNotes(demo: Demo) {
    if (demo.notes && demo.notes.path && demo.notes.showOnTrigger) {
      NotesService.openNotes(demo.notes.path);
    }
  }

  public static async openNotes(filePath: string) {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    const isRelativeFromWorkspace = getSetting<boolean>(Config.relativeFromWorkspace);
    const notesPath = workspaceFolder
      ? isRelativeFromWorkspace
        ? Uri.joinPath(workspaceFolder.uri, filePath)
        : Uri.joinPath(workspaceFolder.uri, General.demoFolder, filePath)
      : undefined;
    const notesFile = notesPath ? await fileExists(notesPath) : false;
    if (!notesFile) {
      Notifications.error("No notes available for this step.");
      return;
    }

    commands.executeCommand("markdown.showPreviewToSide", notesPath);
  }

  private static async viewNotes(item: ActionTreeItem) {
    if (!item || !item.notes) {
      const demoFiles = await FileProvider.getFiles();
      const executingFile = await DemoRunner.getExecutedDemoFile();

      if (demoFiles && executingFile.filePath) {
        let executingDemos = demoFiles[executingFile.filePath].demos;
        const lastDemo = executingFile.demo[executingFile.demo.length - 1];

        let crntDemoIdx = executingDemos.findIndex((d, idx) => (d.id ? d.id === lastDemo.id : idx === lastDemo.idx));

        // Show the notes action
        const crntDemo = executingDemos[crntDemoIdx];
        if (crntDemo.notes && crntDemo.notes.path) {
          NotesService.openNotes(crntDemo.notes.path);
          return;
        }
      }

      Notifications.error("No notes available for this step.");
      return;
    }

    NotesService.openNotes(item.notes);
  }
}
