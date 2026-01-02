import { commands, workspace } from 'vscode';
import { WebviewType } from '../../models';
import { WebViewMessages, Config } from '@demotime/common';
import { BaseWebview } from '../../webview/BaseWebviewPanel';
import { AnalyticsStorage } from './AnalyticsStorage';
import { AnalyticsReporter } from './AnalyticsReporter';
import { AnalyticsService } from './AnalyticsService';
import { Notifications } from '../Notifications';
import { Logger } from '../Logger';
import { formatSessionFilename } from '../../utils';

/**
 * Analytics Dashboard webview for viewing presentation analytics.
 */
export class AnalyticsDashboard extends BaseWebview {
  public static id: WebviewType = 'analytics-dashboard';
  public static title: string = `${Config.title}: Analytics Dashboard`;

  public static show() {
    if (AnalyticsDashboard.isOpen) {
      AnalyticsDashboard.reveal();
    } else {
      AnalyticsDashboard.create();
    }
  }

  public static update() {
    AnalyticsDashboard.postMessage(
      WebViewMessages.toWebview.analyticsDashboard.updateRecordingStatus,
      {
        isRecording: AnalyticsService.isRecording(),
        session: AnalyticsService.getCurrentSession(),
      },
    );
  }

  protected static onCreate() {
    AnalyticsDashboard.isDisposed = false;
  }

  protected static onDispose() {
    AnalyticsDashboard.isDisposed = true;
  }

  protected static async messageListener(message: any) {
    super.messageListener(message);
    const { command, requestId, payload } = message;

    if (!command) {
      return;
    }

    switch (command) {
      case WebViewMessages.toVscode.analyticsDashboard.getSessions:
        await handleGetSessions(requestId);
        break;
      case WebViewMessages.toVscode.analyticsDashboard.getSessionSummary:
        await handleGetSessionSummary(requestId, payload);
        break;
      case WebViewMessages.toVscode.analyticsDashboard.deleteSession:
        await handleDeleteSession(requestId, payload);
        break;
      case WebViewMessages.toVscode.analyticsDashboard.exportSession:
        await handleExportSession(requestId, payload);
        break;
      case WebViewMessages.toVscode.analyticsDashboard.getRecordingStatus:
        handleGetRecordingStatus(requestId);
        break;
      case WebViewMessages.toVscode.openFile:
        const sessionUri = AnalyticsStorage.getSessionFileUri(payload.filename);
        if (!sessionUri) {
          Notifications.error(`Failed to get URI for session file: ${payload.filename}`);
          return;
        }
        await commands.executeCommand('vscode.open', sessionUri);
        break;
    }

    async function handleGetSessions(requestId: string | undefined) {
      try {
        const sessionFiles = await AnalyticsStorage.listSessions();
        const sessions: Array<{
          filename: string;
          type: string;
          date: string;
          isDryRun: boolean;
        }> = [];

        for (const filename of sessionFiles) {
          const parts = filename.replace('.json', '').split('_');
          const type = parts.pop() || 'unknown';
          const dateStr = formatSessionFilename(filename);

          sessions.push({
            filename,
            type,
            date: dateStr,
            isDryRun: type === 'dry-run',
          });
        }

        AnalyticsDashboard.webview?.webview.postMessage({
          command: WebViewMessages.toVscode.analyticsDashboard.getSessions,
          requestId,
          payload: sessions,
        });
      } catch (error) {
        Logger.error(`Failed to get sessions: ${error}`);
        AnalyticsDashboard.webview?.webview.postMessage({
          command: WebViewMessages.toVscode.analyticsDashboard.getSessions,
          requestId,
          payload: [],
        });
      }
    }

    async function handleGetSessionSummary(
      requestId: string | undefined,
      payload: { filename: string },
    ) {
      if (!payload?.filename) {
        AnalyticsDashboard.webview?.webview.postMessage({
          command: WebViewMessages.toVscode.analyticsDashboard.getSessionSummary,
          requestId,
          payload: null,
        });
        return;
      }

      try {
        const session = await AnalyticsStorage.loadSession(payload.filename);
        if (!session) {
          AnalyticsDashboard.webview?.webview.postMessage({
            command: WebViewMessages.toVscode.analyticsDashboard.getSessionSummary,
            requestId,
            payload: null,
          });
          return;
        }

        // Generate summary from session data (no need to persist)
        const summary = AnalyticsReporter.generateSummary(session);

        AnalyticsDashboard.webview?.webview.postMessage({
          command: WebViewMessages.toVscode.analyticsDashboard.getSessionSummary,
          requestId,
          payload: {
            session,
            summary,
          },
        });
      } catch (error) {
        Logger.error(`Failed to get session summary: ${error}`);
        AnalyticsDashboard.webview?.webview.postMessage({
          command: WebViewMessages.toVscode.analyticsDashboard.getSessionSummary,
          requestId,
          payload: null,
        });
      }
    }

    async function handleDeleteSession(
      requestId: string | undefined,
      payload: { filename: string },
    ) {
      if (!payload?.filename) {
        return;
      }

      try {
        await AnalyticsStorage.deleteSession(payload.filename);
        Notifications.info('Analytics session deleted.');

        // Refresh the sessions list
        await handleGetSessions(requestId);
      } catch (error) {
        Logger.error(`Failed to delete session: ${error}`);
        Notifications.error('Failed to delete session.');
      }
    }

    async function handleExportSession(
      requestId: string | undefined,
      payload: { filename: string; format: 'markdown' | 'json' },
    ) {
      if (!payload?.filename) {
        return;
      }

      try {
        const session = await AnalyticsStorage.loadSession(payload.filename);
        if (!session) {
          Notifications.error('Failed to load session for export.');
          return;
        }

        let content: string;
        let language: string;

        if (payload.format === 'markdown') {
          const summary = AnalyticsReporter.generateSummary(session);
          content = AnalyticsReporter.generateTextSummary(summary);
          language = 'markdown';
        } else {
          content = JSON.stringify(session, null, 2);
          language = 'json';
        }

        const doc = await workspace.openTextDocument({
          content,
          language,
        });
        await (await import('vscode')).window.showTextDocument(doc);

        Notifications.info('Session exported. Save the document to keep it.');
      } catch (error) {
        Logger.error(`Failed to export session: ${error}`);
        Notifications.error('Failed to export session.');
      }
    }

    function handleGetRecordingStatus(requestId: string | undefined) {
      AnalyticsDashboard.webview?.webview.postMessage({
        command: WebViewMessages.toVscode.analyticsDashboard.getRecordingStatus,
        requestId,
        payload: {
          isRecording: AnalyticsService.isRecording(),
          session: AnalyticsService.getCurrentSession(),
        },
      });
    }
  }
}
