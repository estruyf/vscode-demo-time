import { readFile } from '../utils';
import { Uri, workspace, window } from 'vscode';
import { Demo, Step, StepNotes } from '../models';
import { DemoRunner } from './DemoRunner';
import { DemoFileProvider } from './DemoFileProvider';
import { Extension } from './Extension';
import { General } from '../constants';

export class NotesService {
  /**
   * Get notes for the current demo step
   * @returns Promise<string | null> The notes content or null if no notes found
   */
  public static async getCurrentStepNotes(): Promise<string | null> {
    const currentDemo = DemoRunner.getCurrentDemo();
    const currentStepIdx = DemoRunner.getCurrentStepIndex();
    
    if (!currentDemo || currentStepIdx === undefined) {
      return null;
    }

    return await this.getStepNotes(currentDemo, currentStepIdx);
  }

  /**
   * Get notes for a specific demo step
   * @param demo The demo object
   * @param stepIndex The step index
   * @returns Promise<string | null> The notes content or null if no notes found
   */
  public static async getStepNotes(demo: Demo, stepIndex: number): Promise<string | null> {
    if (!demo.steps || stepIndex >= demo.steps.length || stepIndex < 0) {
      return null;
    }

    const step = demo.steps[stepIndex];
    
    // Check for step-level notes first
    if (step.notes) {
      if (typeof step.notes === 'string') {
        return step.notes;
      } else if (typeof step.notes === 'object') {
        const stepNotes = step.notes as StepNotes;
        if (stepNotes.content) {
          return stepNotes.content;
        } else if (stepNotes.path) {
          return await this.readNotesFromFile(stepNotes.path);
        }
      }
    }

    // Fall back to demo-level notes
    if (demo.notes?.path) {
      return await this.readNotesFromFile(demo.notes.path);
    }

    return null;
  }

  /**
   * Get notes for a demo by ID
   * @param demoId The demo ID
   * @returns Promise<string | null> The notes content or null if no notes found
   */
  public static async getDemoNotes(demoId: string): Promise<string | null> {
    try {
      const demoFiles = await DemoFileProvider.getFiles();
      
      for (const [filePath, demoFile] of Object.entries(demoFiles)) {
        const demo = demoFile.demos.find(d => d.id === demoId);
        if (demo) {
          if (demo.notes?.path) {
            return await this.readNotesFromFile(demo.notes.path);
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error getting demo notes:', error);
    }

    return null;
  }

  /**
   * Get notes for a demo by title (fallback when ID is not available)
   * @param demoTitle The demo title
   * @returns Promise<string | null> The notes content or null if no notes found
   */
  public static async getDemoNotesByTitle(demoTitle: string): Promise<string | null> {
    try {
      const demoFiles = await DemoFileProvider.getFiles();
      
      for (const [filePath, demoFile] of Object.entries(demoFiles)) {
        const demo = demoFile.demos.find(d => d.title === demoTitle);
        if (demo) {
          if (demo.notes?.path) {
            return await this.readNotesFromFile(demo.notes.path);
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error getting demo notes by title:', error);
    }

    return null;
  }

  /**
   * Read notes content from a file
   * @param notesPath The path to the notes file
   * @returns Promise<string | null> The file content or null if file doesn't exist
   */
  private static async readNotesFromFile(notesPath: string): Promise<string | null> {
    try {
      const workspaceFolder = Extension.getInstance().workspaceFolder;
      if (!workspaceFolder) {
        return null;
      }

      const version = DemoRunner.getCurrentVersion();
      const notesUri = workspaceFolder
        ? version === 2
          ? Uri.joinPath(workspaceFolder.uri, notesPath)
          : Uri.joinPath(workspaceFolder.uri, General.demoFolder, notesPath)
        : undefined;

      if (notesUri) {
        const content = await readFile(notesUri);
        return content;
      }
    } catch (error) {
      console.error('Error reading notes file:', error);
    }

    return null;
  }

  /**
   * Get preview of notes (first few lines)
   * @param notes The full notes content
   * @param maxLines Maximum number of lines to return
   * @returns string The preview content
   */
  public static getNotesPreview(notes: string, maxLines: number = 3): string {
    if (!notes) return '';
    
    const lines = notes.split('\n');
    if (lines.length <= maxLines) {
      return notes;
    }
    
    return lines.slice(0, maxLines).join('\n') + '...';
  }

  /**
   * Open notes file in editor
   * @param notesPath The path to the notes file
   */
  public static async openNotes(notesPath: string): Promise<void> {
    try {
      const workspaceFolder = Extension.getInstance().workspaceFolder;
      if (!workspaceFolder) {
        window.showErrorMessage('No workspace folder found');
        return;
      }

      const version = DemoRunner.getCurrentVersion();
      const notesUri = workspaceFolder
        ? version === 2
          ? Uri.joinPath(workspaceFolder.uri, notesPath)
          : Uri.joinPath(workspaceFolder.uri, General.demoFolder, notesPath)
        : undefined;

      if (notesUri) {
        const document = await workspace.openTextDocument(notesUri);
        await window.showTextDocument(document);
      }
    } catch (error) {
      console.error('Error opening notes file:', error);
      window.showErrorMessage(`Failed to open notes file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a demo or step has notes available
   * @param demo The demo object
   * @param stepIndex Optional step index to check for step-specific notes
   * @returns boolean True if notes are available
   */
  public static hasNotes(demo: Demo, stepIndex?: number): boolean {
    if (typeof stepIndex === 'number' && demo.steps && stepIndex < demo.steps.length && stepIndex >= 0) {
      const step = demo.steps[stepIndex];
      if (step.notes) {
        return true;
      }
    }

    return !!demo.notes?.path;
  }
}
