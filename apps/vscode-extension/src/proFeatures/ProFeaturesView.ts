import { commands } from 'vscode';
import { Subscription, WebviewType } from '../models';
import { Extension, SponsorService } from '../services';
import { COMMAND, WebViewMessages, Config } from '@demotime/common';
import { BaseWebview } from '../webview/BaseWebviewPanel';

export class ProFeaturesView extends BaseWebview {
  public static id: WebviewType = 'pro-features';
  public static title: string = `${Config.title}: Pro Features`;

  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(commands.registerCommand(COMMAND.showProFeatures, ProFeaturesView.show));
  }

  public static show() {
    if (ProFeaturesView.isOpen) {
      ProFeaturesView.reveal();
    } else {
      ProFeaturesView.create();
    }
  }

  /**
   * Notify the webview of sponsor status changes
   */
  public static notifySponsorStatusChange(isSponsor: boolean) {
    ProFeaturesView.postMessage(WebViewMessages.toWebview.updateSponsorStatus, { isSponsor });
  }

  protected static onCreate() {
    ProFeaturesView.isDisposed = false;
  }

  protected static onDispose() {
    ProFeaturesView.isDisposed = true;
  }

  protected static async messageListener(message: any) {
    await super.messageListener(message);
    const { command, requestId } = message;

    if (!command) {
      return;
    }

    if (command === WebViewMessages.toVscode.proFeatures.getSponsorStatus) {
      const isSponsor = SponsorService.getSponsorStatus();
      ProFeaturesView.postRequestMessage(
        WebViewMessages.toVscode.proFeatures.getSponsorStatus,
        requestId || '',
        { isSponsor },
      );
    }
  }
}
