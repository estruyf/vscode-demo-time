import { commands, env, Uri } from 'vscode';
import { Extension } from './Extension';
import { COMMAND } from '@demotime/common';

export class ResourceService {
  public static registerCommands(): void {
    const subscriptions = Extension.getInstance().subscriptions;
    subscriptions.push(
      commands.registerCommand(COMMAND.openSupportTheProject, () => {
        env.openExternal(Uri.parse('https://github.com/sponsors/estruyf'));
      }),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.openRemoteControl, () => {
        env.openExternal(Uri.parse('https://remote.demotime.show'));
      }),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.openPowerPointAddin, () => {
        env.openExternal(Uri.parse('https://demotime.show/integrations/powerpoint/'));
      }),
    );
  }
}
