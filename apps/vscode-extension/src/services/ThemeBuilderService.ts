import { commands } from 'vscode';
import { Subscription } from '../models';
import { Extension } from './Extension';
import { SponsorService } from './SponsorService';
import { Notifications } from './Notifications';
import { COMMAND } from '@demotime/common';
import { ThemeBuilderPanel } from '../panels/ThemeBuilderPanel';

export class ThemeBuilderService {
  /**
   * Register the theme builder commands
   */
  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(
      commands.registerCommand(COMMAND.openThemeBuilder, ThemeBuilderService.openThemeBuilder),
    );
  }

  /**
   * Open the theme builder panel (pro feature)
   */
  private static async openThemeBuilder() {
    // Check if user is a sponsor (pro feature)
    const isSponsor = SponsorService.getSponsorStatus();

    if (!isSponsor) {
      const selection = await Notifications.warning(
        'Theme Builder is a Pro feature. Please authenticate with GitHub to unlock it.',
        'Authenticate',
      );

      if (selection === 'Authenticate') {
        await commands.executeCommand(COMMAND.authenticate);
        
        // Check again after authentication
        const isNowSponsor = SponsorService.getSponsorStatus();
        if (!isNowSponsor) {
          Notifications.info(
            'To access Pro features, please consider sponsoring the project.',
          );
          return;
        }
      } else {
        return;
      }
    }

    // Open the theme builder panel
    await ThemeBuilderPanel.render();
  }
}
