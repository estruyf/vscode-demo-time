import { commands, window, workspace } from 'vscode';
import { COMMAND } from '@demotime/common';
import { AnalyticsService } from './AnalyticsService';
import { AnalyticsStorage } from './AnalyticsStorage';
import { AnalyticsReporter } from './AnalyticsReporter';
import { Extension } from '../Extension';
import { Notifications } from '../Notifications';
import { Logger } from '../Logger';
import { Subscription } from '../../models';
import { DemoFileProvider } from '../DemoFileProvider';
import { SponsorService } from '../SponsorService';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { formatSessionFilename } from '../../utils';
import { DemoRunner } from '../DemoRunner';

/**
 * Handles registration and execution of analytics-related commands.
 */
export class AnalyticsCommands {
  private static readonly PRO_FEATURE_MESSAGE =
    'Analytics is a PRO feature. Please become a GitHub sponsor to unlock this feature.';

  /**
   * Checks if the user has PRO access. Shows a warning if not.
   */
  private static checkProAccess(): boolean {
    if (!SponsorService.getSponsorStatus()) {
      Notifications.warning(AnalyticsCommands.PRO_FEATURE_MESSAGE);
      return false;
    }
    return true;
  }

  /**
   * Registers all analytics commands.
   */
  public static registerCommands(): void {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(
      commands.registerCommand(COMMAND.analyticsStart, AnalyticsCommands.startRecording),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.analyticsStop, AnalyticsCommands.stopRecording),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.analyticsDashboard, AnalyticsCommands.openDashboard),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.analyticsExport, AnalyticsCommands.exportSession),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.analyticsToggle, AnalyticsCommands.toggleRecording),
    );
  }

  /**
   * Starts analytics recording for the current or next presentation.
   */
  public static async startRecording(): Promise<void> {
    if (!AnalyticsCommands.checkProAccess()) {
      return;
    }

    if (AnalyticsService.isRecording()) {
      Notifications.warning('Analytics recording is already active');
      return;
    }

    // Ask if this is a dry run or live presentation
    const sessionType = await window.showQuickPick(
      [
        { label: 'Dry Run / Practice', description: 'Record a practice session', isDryRun: true },
        { label: 'Live Presentation', description: 'Record a live presentation', isDryRun: false },
      ],
      {
        title: 'Start Analytics Recording',
        placeHolder: 'Select session type',
      },
    );

    if (!sessionType) {
      return;
    }

    // Get current act file info
    const executingFile = await DemoRunner.getExecutedDemoFile();
    let demoFilePath = executingFile.filePath;
    let demoTitle = 'Untitled';

    if (demoFilePath) {
      const demoFiles = await DemoFileProvider.getFiles();
      if (demoFiles && demoFiles[demoFilePath]) {
        demoTitle = demoFiles[demoFilePath].title || 'Untitled';
      }
    } else {
      // Try to get the first act file
      const demoFiles = await DemoFileProvider.getFiles();
      if (demoFiles) {
        const firstPath = Object.keys(demoFiles)[0];
        if (firstPath) {
          demoFilePath = firstPath;
          demoTitle = demoFiles[firstPath].title || 'Untitled';
        }
      }
    }

    if (!demoFilePath) {
      Notifications.error('No act file found. Please initialize a demo first.');
      return;
    }

    // Enable analytics config
    AnalyticsService.setConfig({ enabled: true });

    // Start the session with presentation title
    const sessionId = await AnalyticsService.startSession(demoTitle, sessionType.isDryRun);

    Notifications.info(
      `Analytics recording started (${sessionType.isDryRun ? 'Dry Run' : 'Live'})`,
    );
    Logger.info(`Analytics session started: ${sessionId}`);
  }

  /**
   * Stops the current analytics recording.
   */
  public static async stopRecording(): Promise<void> {
    if (!AnalyticsCommands.checkProAccess()) {
      return;
    }

    if (!AnalyticsService.isRecording()) {
      Notifications.warning('No analytics recording is active');
      return;
    }

    const summary = await AnalyticsService.endSession();

    if (summary) {
      const action = await Notifications.info(
        `Analytics recording stopped. Duration: ${AnalyticsReporter.formatDuration(summary.totalDuration)}`,
        'View Summary',
        'Dismiss',
      );

      if (action === 'View Summary') {
        // Show a quick summary
        const textSummary = AnalyticsReporter.generateTextSummary(summary);
        await window.showTextDocument(
          await workspace.openTextDocument({
            content: textSummary,
            language: 'markdown',
          }),
        );
      }
    }
  }

  /**
   * Toggles analytics recording on/off.
   */
  private static async toggleRecording(): Promise<void> {
    if (!AnalyticsCommands.checkProAccess()) {
      return;
    }

    if (AnalyticsService.isRecording()) {
      await AnalyticsCommands.stopRecording();
    } else {
      await AnalyticsCommands.startRecording();
    }
  }

  /**
   * Opens the analytics dashboard.
   */
  private static async openDashboard(): Promise<void> {
    if (!AnalyticsCommands.checkProAccess()) {
      return;
    }

    AnalyticsDashboard.show();
  }

  /**
   * Exports analytics session data.
   */
  private static async exportSession(): Promise<void> {
    if (!AnalyticsCommands.checkProAccess()) {
      return;
    }

    const sessions = await AnalyticsStorage.listSessions();

    if (sessions.length === 0) {
      Notifications.info('No analytics sessions found to export.');
      return;
    }

    // Let user pick a session
    const items = sessions.map((filename) => {
      const parts = filename.replace('.json', '').split('_');
      const type = parts.pop() || 'unknown';
      const dateStr = formatSessionFilename(filename);

      return {
        label: `${type === 'dry-run' ? '🎯' : '🎬'} ${type === 'dry-run' ? 'Dry Run' : 'Live'}`,
        description: dateStr,
        filename,
      };
    });

    const selected = await window.showQuickPick(items, {
      title: 'Export Analytics Session',
      placeHolder: 'Select a session to export',
    });

    if (!selected) {
      return;
    }

    // Load session
    const session = await AnalyticsStorage.loadSession(selected.filename);
    if (!session) {
      Notifications.error('Failed to load session');
      return;
    }

    // Ask for export format
    const format = await window.showQuickPick(
      [
        { label: 'Markdown Summary', format: 'markdown' },
        { label: 'JSON (Full Data)', format: 'json' },
      ],
      {
        title: 'Export Format',
        placeHolder: 'Select export format',
      },
    );

    if (!format) {
      return;
    }

    let content: string;
    let language: string;

    if (format.format === 'markdown') {
      const summary = AnalyticsReporter.generateSummary(session);
      content = AnalyticsReporter.generateTextSummary(summary);
      language = 'markdown';
    } else {
      content = JSON.stringify(session, null, 2);
      language = 'json';
    }

    await window.showTextDocument(
      await workspace.openTextDocument({
        content,
        language,
      }),
    );

    Notifications.info('Session exported. Save the document to keep it.');
  }
}
