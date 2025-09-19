import { commands } from 'vscode';
import { Extension } from './Extension';
import { setContext } from '../utils';
import { ContextKeys } from '../constants';
import { COMMAND, WebViewMessages } from '@demotime/common';
import { DemoStatusBar } from './DemoStatusBar';
import { PresenterView } from '../presenterView/PresenterView';

export class InputService {
  private static waitingPromise: Promise<void> | null = null;
  private static resolveWaiting: (() => void) | null = null;

  /**
   * Register the triggerNext command.
   */
  public static registerCommands() {
    const subscriptions = Extension.getInstance().subscriptions;
    subscriptions.push(commands.registerCommand(COMMAND.continueDemo, InputService.triggerNext));
  }

  /**
   * Called by a demo action to pause execution until "Demo Time: Continue Demo" is called.
   */
  public static async pause(): Promise<void> {
    await setContext(ContextKeys.isWaitingForNext, true);

    DemoStatusBar.updateNextDemoItem('Continue Demo', COMMAND.continueDemo);
    if (PresenterView.isOpen) {
      PresenterView.postMessage(WebViewMessages.toWebview.preview.updateNextStep, {
        title: 'Continue Demo',
        command: COMMAND.continueDemo,
      });
    }

    if (!InputService.waitingPromise) {
      InputService.waitingPromise = new Promise<void>((resolve) => {
        InputService.resolveWaiting = () => {
          setContext(ContextKeys.isWaitingForNext, false);

          const nextDemo = DemoStatusBar.getNextDemo();
          if (!nextDemo) {
            DemoStatusBar.updateNextDemoItem('', COMMAND.start, false);
            if (PresenterView.isOpen) {
              PresenterView.postMessage(WebViewMessages.toWebview.preview.updateNextStep, {
                title: '',
                command: COMMAND.start,
              });
            }
          } else {
            DemoStatusBar.updateNextDemoItem(nextDemo?.title || '', COMMAND.start);
            if (PresenterView.isOpen) {
              PresenterView.postMessage(WebViewMessages.toWebview.preview.updateNextStep, {
                title: nextDemo?.title,
                command: COMMAND.start,
              });
            }
          }

          InputService.waitingPromise = null;
          InputService.resolveWaiting = null;

          setTimeout(() => {
            resolve();
          }, 200);
        };
      });
    }

    return InputService.waitingPromise;
  }

  /**
   * Called by a command to resume execution after pause.
   */
  public static triggerNext() {
    if (InputService.resolveWaiting) {
      InputService.resolveWaiting();
    }
  }
}
