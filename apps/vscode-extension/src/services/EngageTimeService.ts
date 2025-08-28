import { Config, Poll } from '@demotime/common';
import { Extension, Notifications } from '.';
import * as vscode from 'vscode';

export class EngageTimeService {
  private static readonly API_URL = 'https://api.engagetime.live';

  public static async getApiKey(): Promise<string | undefined> {
    const ext = Extension.getInstance();
    return (await ext.context.secrets.get(Config.secrets.engageTime.apiKey)) || '';
  }

  public static async setApiKey(value: string | undefined): Promise<void> {
    const ext = Extension.getInstance();
    if (!value) {
      await ext.context.secrets.delete(Config.secrets.engageTime.apiKey);
      return;
    }
    await ext.context.secrets.store(Config.secrets.engageTime.apiKey, value);
  }

  public static async showSession(sessionId?: string): Promise<void> {
    if (!sessionId) {
      Notifications.error(`Engage Time session ID is required to show a session.`);
      return;
    }

    await vscode.commands.executeCommand(
      'simpleBrowser.show',
      vscode.Uri.parse(`https://engagetime.live/session-details/${sessionId}`),
    );
  }

  public static async showPoll(pollId?: string): Promise<void> {
    if (!pollId) {
      Notifications.error(`Engage Time poll ID is required to show a poll.`);
      return;
    }

    await vscode.commands.executeCommand(
      'simpleBrowser.show',
      vscode.Uri.parse(`https://engagetime.live/poll/${pollId}`),
    );
  }

  public static async startSession(sessionId?: string): Promise<void> {
    await EngageTimeService.updateSessionState(sessionId, 'active');
  }

  public static async stopSession(sessionId?: string): Promise<void> {
    await EngageTimeService.updateSessionState(sessionId, 'closed');
  }

  public static async startPoll(pollId?: string): Promise<void> {
    await EngageTimeService.updatePollState(pollId, true);
  }

  public static async stopPoll(pollId?: string): Promise<void> {
    await EngageTimeService.updatePollState(pollId, false);
  }

  public static async getPolls(sessionId?: string): Promise<Poll[]> {
    if (!sessionId) {
      Notifications.error(`Engage Time session ID is required to get polls.`);
      return [];
    }

    const apiKey = await EngageTimeService.getApiKey();
    if (!apiKey) {
      Notifications.error(`Engage Time API key is required to get polls.`);
      return [];
    }

    try {
      const response = await fetch(`${EngageTimeService.API_URL}/sessions/${sessionId}/polls`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        Notifications.error(`Failed to get Engage Time polls: ${response.status} ${errorText}`);
        return [];
      }

      const data = await response.json();
      return data || [];
    } catch (error: any) {
      Notifications.error(`Error getting Engage Time polls: ${error.message}`);
      return [];
    }
  }

  private static async updateSessionState(
    sessionId: string | undefined,
    state: 'active' | 'closed' | 'archived',
  ): Promise<void> {
    if (!sessionId) {
      Notifications.error(
        `Engage Time session ID is required to ${state === 'active' ? 'start' : 'stop'} a session.`,
      );
      return;
    }

    const apiKey = await EngageTimeService.getApiKey();
    if (!apiKey) {
      Notifications.error(
        `Engage Time API key is required to ${state === 'active' ? 'start' : 'stop'} a session.`,
      );
      return;
    }

    try {
      const response = await fetch(`${EngageTimeService.API_URL}/sessions/${sessionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${apiKey}`,
        },
        body: JSON.stringify({ state }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        Notifications.error(
          `Failed to ${state === 'active' ? 'start' : 'stop'} Engage Time session: ${response.status} ${errorText}`,
        );
        return;
      }

      Notifications.info(
        `Engage Time session ${state === 'active' ? 'started' : 'stopped'} successfully.`,
      );
    } catch (error: any) {
      Notifications.error(
        `Error ${state === 'active' ? 'starting' : 'stopping'} Engage Time session: ${error.message}`,
      );
    }
  }

  private static async updatePollState(
    pollId: string | undefined,
    isActive: boolean,
  ): Promise<void> {
    if (!pollId) {
      Notifications.error(
        `Engage Time poll ID is required to ${isActive ? 'start' : 'stop'} a poll.`,
      );
      return;
    }

    const apiKey = await EngageTimeService.getApiKey();
    if (!apiKey) {
      Notifications.error(
        `Engage Time API key is required to ${isActive ? 'start' : 'stop'} a poll.`,
      );
      return;
    }

    try {
      const response = await fetch(`${EngageTimeService.API_URL}/polls/${pollId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${apiKey}`,
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        Notifications.error(
          `Failed to ${isActive ? 'start' : 'stop'} Engage Time poll: ${response.status} ${errorText}`,
        );
        return;
      }

      Notifications.info(`Engage Time poll ${isActive ? 'started' : 'stopped'} successfully.`);
    } catch (error: any) {
      Notifications.error(
        `Error ${isActive ? 'starting' : 'stopping'} Engage Time poll: ${error.message}`,
      );
    }
  }
}
