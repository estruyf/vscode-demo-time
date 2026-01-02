import { Uri, workspace } from 'vscode';
import { PresentationSession } from '@demotime/common';
import { Extension } from '../Extension';
import { Logger } from '../Logger';
import { parseWinPath } from '@estruyf/vscode';

const ANALYTICS_FOLDER = '.demo/analytics';
const SESSIONS_FOLDER = 'sessions';

/**
 * Service for persisting and retrieving analytics data.
 * Stores data in .demo/analytics/ folder structure.
 */
export class AnalyticsStorage {
  /**
   * Gets the analytics folder URI for the current workspace.
   */
  private static getAnalyticsFolderUri(): Uri | undefined {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return undefined;
    }
    return Uri.joinPath(workspaceFolder.uri, ANALYTICS_FOLDER);
  }

  /**
   * Gets the sessions folder URI.
   */
  private static getSessionsFolderUri(): Uri | undefined {
    const analyticsFolder = AnalyticsStorage.getAnalyticsFolderUri();
    if (!analyticsFolder) {
      return undefined;
    }
    return Uri.joinPath(analyticsFolder, SESSIONS_FOLDER);
  }

  /**
   * Ensures the analytics folder structure exists.
   */
  public static async ensureFoldersExist(): Promise<boolean> {
    try {
      const sessionsFolder = AnalyticsStorage.getSessionsFolderUri();

      if (!sessionsFolder) {
        return false;
      }

      await workspace.fs.createDirectory(sessionsFolder);
      return true;
    } catch (error) {
      Logger.error(`Failed to create analytics folders: ${error}`);
      return false;
    }
  }

  /**
   * Generates a session filename based on timestamp and type.
   */
  private static generateSessionFilename(session: PresentationSession): string {
    const timestamp = session.startTime.replace(/[:.]/g, '-');
    const type = session.isDryRun ? 'dry-run' : 'live';
    return `${timestamp}_${type}.json`;
  }

  /**
   * Saves a presentation session to disk.
   */
  public static async saveSession(session: PresentationSession): Promise<boolean> {
    try {
      const sessionsFolder = AnalyticsStorage.getSessionsFolderUri();
      if (!sessionsFolder) {
        Logger.warning('Cannot save session: no workspace folder');
        return false;
      }

      await AnalyticsStorage.ensureFoldersExist();

      const filename = AnalyticsStorage.generateSessionFilename(session);
      const fileUri = Uri.joinPath(sessionsFolder, filename);
      const content = JSON.stringify(session, null, 2);
      await workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf-8'));

      Logger.info(`Analytics session saved: ${filename}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to save analytics session: ${error}`);
      return false;
    }
  }

  /**
   * Loads a presentation session from disk.
   */
  public static async loadSession(filename: string): Promise<PresentationSession | undefined> {
    try {
      filename = parseWinPath(filename);

      const sessionsFolder = AnalyticsStorage.getSessionsFolderUri();
      if (!sessionsFolder) {
        return undefined;
      }

      const fileUri = Uri.joinPath(sessionsFolder, filename);
      const content = await workspace.fs.readFile(fileUri);
      return JSON.parse(Buffer.from(content).toString('utf-8')) as PresentationSession;
    } catch (error) {
      Logger.error(`Failed to load analytics session: ${error}`);
      return undefined;
    }
  }

  /**
   * Gets the URI of a session file.
   */
  public static getSessionFileUri(filename: string): Uri | undefined {
    try {
      filename = parseWinPath(filename);
      const sessionsFolder = AnalyticsStorage.getSessionsFolderUri();
      if (!sessionsFolder) {
        return undefined;
      }

      const fileUri = Uri.joinPath(sessionsFolder, filename);
      return fileUri;
    } catch (error) {
      Logger.error(`Failed to get session file URI: ${error}`);
      return undefined;
    }
  }

  /**
   * Lists all saved sessions.
   */
  public static async listSessions(): Promise<string[]> {
    try {
      const sessionsFolder = AnalyticsStorage.getSessionsFolderUri();
      if (!sessionsFolder) {
        return [];
      }

      const entries = await workspace.fs.readDirectory(sessionsFolder);
      return entries
        .filter(([name, type]) => type === 1 && name.endsWith('.json')) // 1 = file
        .map(([name]) => name)
        .sort()
        .reverse(); // Most recent first
    } catch {
      return [];
    }
  }

  /**
   * Deletes a session file.
   */
  public static async deleteSession(filename: string): Promise<boolean> {
    try {
      filename = parseWinPath(filename);

      const sessionsFolder = AnalyticsStorage.getSessionsFolderUri();
      if (!sessionsFolder) {
        return false;
      }

      const fileUri = Uri.joinPath(sessionsFolder, filename);
      await workspace.fs.delete(fileUri);

      return true;
    } catch (error) {
      Logger.error(`Failed to delete analytics session: ${error}`);
      return false;
    }
  }

  /**
   * Gets the total size of analytics data in bytes.
   */
  public static async getStorageSize(): Promise<number> {
    try {
      const analyticsFolder = AnalyticsStorage.getAnalyticsFolderUri();
      if (!analyticsFolder) {
        return 0;
      }

      let totalSize = 0;
      const sessions = await AnalyticsStorage.listSessions();

      for (const filename of sessions) {
        const sessionsFolder = AnalyticsStorage.getSessionsFolderUri();
        if (sessionsFolder) {
          const fileUri = Uri.joinPath(sessionsFolder, filename);
          try {
            const stat = await workspace.fs.stat(fileUri);
            totalSize += stat.size;
          } catch {
            // Ignore
          }
        }
      }

      return totalSize;
    } catch {
      return 0;
    }
  }
}
