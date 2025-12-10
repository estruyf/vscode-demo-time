import { commands, env, Uri } from 'vscode';
import { Extension } from './Extension';
import { COMMAND } from '@demotime/common';

export class SupportService {
  public static registerCommands(): void {
    const subscriptions = Extension.getInstance().subscriptions;
    subscriptions.push(
      commands.registerCommand(COMMAND.supportTheProject, () => {
        env.openExternal(Uri.parse('https://github.com/sponsors/estruyf'));
      }),
    );
  }
}
