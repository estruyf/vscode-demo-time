import { commands } from 'vscode';
import { Subscription } from '../models';
import { Action, Demo, getDemosFromConfig, COMMAND, SlideNotes } from '@demotime/common';
import { Extension } from './Extension';
import { ActionTreeItem } from '../providers/ActionTreeviewProvider';
import { Notifications } from './Notifications';
import { fileExists, getFileUri, isPathInWorkspace, readFile } from '../utils';
import { DemoFileProvider } from './DemoFileProvider';
import { DemoRunner } from './DemoRunner';

export class NotesService {
  private static slideNotes: SlideNotes | undefined;

  public static registerCommands() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(commands.registerCommand(COMMAND.viewNotes, NotesService.viewNotes));
  }

  /**
   * Stores the notes of the slide in the slide preview
   */
  public static setSlideNotes(slideNotes: SlideNotes | undefined) {
    NotesService.slideNotes = slideNotes;
  }

  /**
   * Returns the notes of the slide in the slide preview, when they apply to the current scene.
   * A scene that doesn't open slides uses its own notes, even when the slide preview is still
   * open.
   */
  public static getSlideNotes(): SlideNotes | undefined {
    if (!NotesService.slideNotes?.notes) {
      return undefined;
    }

    const demo = DemoRunner.currentDemo;
    if (demo && !demo.steps?.some((step) => step.action === Action.OpenSlide)) {
      return undefined;
    }

    return NotesService.slideNotes;
  }

  /**
   * Returns the notes to show for the current slide: its own notes, or else the notes file of the
   * current scene.
   */
  public static async getCurrentNotes(): Promise<string | undefined> {
    const slideNotes = NotesService.getSlideNotes();
    if (slideNotes?.notes) {
      return slideNotes.notes;
    }

    const notesPath = DemoRunner.currentDemo?.notes?.path;
    return notesPath ? NotesService.readNotes(notesPath) : undefined;
  }

  /**
   * Reads a notes file, when it is in the workspace.
   */
  public static async readNotes(filePath: string): Promise<string | undefined> {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    const version = await DemoRunner.getCurrentVersion();
    const notesPath = getFileUri(filePath, workspaceFolder, version);

    // Verify the resolved path is contained within the workspace, so it can't escape it
    if (!notesPath || !isPathInWorkspace(notesPath, workspaceFolder)) {
      return undefined;
    }

    try {
      return await readFile(notesPath);
    } catch {
      return undefined;
    }
  }

  public static async showNotes(demo: Demo) {
    if (demo.notes && demo.notes.path && demo.notes.showOnTrigger) {
      NotesService.openNotes(demo.notes.path);
    }
  }

  public static async openNotes(filePath: string) {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    const version = await DemoRunner.getCurrentVersion();
    const notesPath = getFileUri(filePath, workspaceFolder, version);

    // Verify the resolved path is contained within the workspace
    if (!notesPath || !isPathInWorkspace(notesPath, workspaceFolder)) {
      Notifications.error('Notes file is not accessible or outside workspace.');
      return;
    }

    const notesFile = await fileExists(notesPath);
    if (!notesFile) {
      Notifications.error('No notes available for this step.');
      return;
    }

    commands.executeCommand('markdown.showPreviewToSide', notesPath);
  }

  private static async viewNotes(item: ActionTreeItem) {
    if (!item || !item.notes) {
      const demoFiles = await DemoFileProvider.getFiles();
      const executingFile = await DemoRunner.getExecutedDemoFile();

      if (demoFiles && executingFile.filePath) {
        const demoFileEntry = demoFiles[executingFile.filePath];
        const executingDemos = getDemosFromConfig(demoFileEntry);

        if (!executingDemos || executingDemos.length === 0) {
          Notifications.error('No notes available for this step.');
          return;
        }

        const lastDemo =
          executingFile.demo && executingFile.demo.length > 0
            ? executingFile.demo[executingFile.demo.length - 1]
            : undefined;

        if (!lastDemo) {
          Notifications.error('No notes available for this step.');
          return;
        }

        const crntDemoIdx = executingDemos.findIndex((d, idx) =>
          d.id ? d.id === lastDemo.id : idx === lastDemo.idx,
        );

        if (crntDemoIdx === -1) {
          Notifications.error('No notes available for this step.');
          return;
        }

        // Show the notes action
        const crntDemo = executingDemos[crntDemoIdx];
        if (crntDemo?.notes?.path) {
          NotesService.openNotes(crntDemo.notes.path);
          return;
        }
      }

      Notifications.error('No notes available for this step.');
      return;
    }

    NotesService.openNotes(item.notes);
  }
}
