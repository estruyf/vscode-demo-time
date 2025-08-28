import { commands } from 'vscode';
import { Extension } from './Extension';
import { setContext } from '../utils';
import { ContextKeys } from '../constants';
import { COMMAND } from '@demotime/common';

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
  public static async waitForNext(): Promise<void> {
    await setContext(ContextKeys.isWaitingForNext, true);
    if (!InputService.waitingPromise) {
      InputService.waitingPromise = new Promise<void>((resolve) => {
        InputService.resolveWaiting = () => {
          setContext(ContextKeys.isWaitingForNext, false);
          InputService.waitingPromise = null;
          InputService.resolveWaiting = null;
          resolve();
        };
      });
    }
    return InputService.waitingPromise;
  }

  /**
   * Called by a command to resume execution after waitForNext.
   */
  public static triggerNext() {
    if (InputService.resolveWaiting) {
      InputService.resolveWaiting();
    }
  }
}
