import { authentication, commands, ExtensionContext } from 'vscode';
import { ContextKeys, General, StateKeys } from '../constants';
import { Extension } from './Extension';
import { Logger } from './Logger';

export class SponsorService {
  /**
   * Initialize the sponsor service
   */
  public static async init(context: ExtensionContext) {
    // Check sponsor status on startup
    await SponsorService.checkSponsor();

    // Register the authenticate command
    context.subscriptions.push(
      commands.registerCommand('demo-time.authenticate', async () => {
        await authentication.getSession('github', ['read:user'], { createIfNone: true });
        await SponsorService.checkSponsor();
      })
    );
  }

  /**
   * Check if the authenticated user is a GitHub Sponsor
   */
  public static async checkSponsor(): Promise<void> {
    const ext = Extension.getInstance();

    try {
      // Try to get the GitHub authentication session silently (without prompting)
      const githubAuth = await authentication.getSession('github', ['read:user'], { silent: true });

      if (githubAuth && githubAuth.accessToken) {
        // User is authenticated, check sponsor status via API
        const response = await fetch(General.sponsorApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            token: githubAuth.accessToken,
          }),
        });

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
            if (isSponsor) {
              Logger.info('GitHub Sponsor status verified. Pro features unlocked! 🎉');
            } else {
              Logger.info('Not a GitHub Sponsor. Pro features are locked.');
            }
          }
        } else {
          // API call failed, user is not a sponsor
          await ext.setState(StateKeys.sponsor, false);
          await commands.executeCommand('setContext', ContextKeys.isSponsor, false);
          Logger.warning('Failed to verify sponsor status. API returned non-OK response.');
        }
      } else {
        // User is not authenticated
        await ext.setState(StateKeys.sponsor, undefined);
        await commands.executeCommand('setContext', ContextKeys.isSponsor, false);
      }
    } catch (error) {
      Logger.error(`Failed to check sponsor status: ${(error as Error).message}`);
      await ext.setState(StateKeys.sponsor, false);
      await commands.executeCommand('setContext', ContextKeys.isSponsor, false);
    }
  }

  /**
   * Get the current sponsor status
   */
  public static getSponsorStatus(): boolean {
    const ext = Extension.getInstance();
    return ext.getState<boolean>(StateKeys.sponsor) ?? false;
  }
}
