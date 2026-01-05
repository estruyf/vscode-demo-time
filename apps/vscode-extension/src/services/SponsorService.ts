import { authentication, commands, ExtensionContext } from 'vscode';
import { ContextKeys, General, StateKeys } from '../constants';
import { Extension } from './Extension';
import { Logger } from './Logger';
import { COMMAND } from '@demotime/common';
import { Notifications } from './Notifications';
import { ResourcesPanel } from '../panels/ResourcesPanel';

// GitHub scopes required for sponsor verification
const GITHUB_AUTH_SCOPES = ['read:user', 'read:org'];

export class SponsorService {
  /**
   * Initialize the sponsor service
   */
  public static async init(context: ExtensionContext) {
    // Check sponsor status on startup
    await SponsorService.checkSponsor();

    // Register the authenticate command
    context.subscriptions.push(
      commands.registerCommand(COMMAND.authenticate, async () => {
        try {
          const auth = await authentication.getSession('github', GITHUB_AUTH_SCOPES, {
            createIfNone: true,
          });
          if (auth.accessToken) {
            Notifications.info('GitHub authentication successful.');
          } else {
            Notifications.warning('GitHub authentication failed or was cancelled.');
          }
          await SponsorService.checkSponsor();
          // Update the resources tree view to reflect sponsor status changes
          ResourcesPanel.update();
        } catch (err) {
          Notifications.error(`GitHub authentication error: ${(err as Error).message}`);
        }
      }),
    );
  }

  /**
   * Check if the authenticated user is a GitHub Sponsor
   */
  public static async checkSponsor(): Promise<boolean> {
    const ext = Extension.getInstance();

    try {
      // Try to get the GitHub authentication session silently (without prompting)
      const githubAuth = await authentication.getSession('github', GITHUB_AUTH_SCOPES, {
        silent: true,
      });

      if (githubAuth && githubAuth.accessToken) {
        const ext = Extension.getInstance();
        const isProd = ext.isProductionMode;
        // User is authenticated, check sponsor status via API
        const response = await fetch(
          isProd
            ? General.sponsorApiUrl
            : General.sponsorApiUrl.replace('demotime.show', 'beta.demotime.show'),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              accept: 'application/json',
            },
            body: JSON.stringify({
              token: githubAuth.accessToken,
            }),
          },
        );

        if (response.ok) {
          const data = await response.json();
          const isSponsor = data.isSponsor === true;

          // Get previous sponsor state
          const prevState = ext.getState<boolean>(StateKeys.sponsor);

          // Update state and context
          await ext.setState(StateKeys.sponsor, isSponsor);
          await commands.executeCommand('setContext', ContextKeys.isSponsor, isSponsor);

          // Log status change
          if (prevState !== isSponsor) {
            // Update the resources tree view when sponsor status changes
            ResourcesPanel.update();
            if (isSponsor) {
              Logger.info('GitHub Sponsor status verified. Pro features unlocked! 🎉');
              return true;
            } else {
              Logger.info('Not a GitHub Sponsor. Pro features are locked.');
              return false;
            }
          }

          // No change in sponsor state; return current status
          return isSponsor;
        } else {
          // API call failed, user is not a sponsor
          await ext.setState(StateKeys.sponsor, false);
          await commands.executeCommand('setContext', ContextKeys.isSponsor, false);
          Logger.warning('Failed to verify sponsor status. API returned non-OK response.');
          return false;
        }
      } else {
        // User is not authenticated
        await ext.setState(StateKeys.sponsor, undefined);
        await commands.executeCommand('setContext', ContextKeys.isSponsor, false);
        return false;
      }
    } catch (error) {
      Logger.error(`Failed to check sponsor status: ${(error as Error).message}`);
      await ext.setState(StateKeys.sponsor, false);
      await commands.executeCommand('setContext', ContextKeys.isSponsor, false);
      return false;
    }
  }

  /**
   * Get the current sponsor status
   */
  public static getSponsorStatus(): boolean {
    const ext = Extension.getInstance();
    const value = ext.getState<boolean>(StateKeys.sponsor) ?? false;
    return value;
  }
}
