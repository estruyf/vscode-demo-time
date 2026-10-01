import { commands, QuickPickItem, window } from 'vscode';
import { homedir } from 'os';
import { join } from 'path';
import { COMMAND, Config } from '@demotime/common';
import { StateKeys } from '../constants';
import {
  AI_SKILLS_TARGETS,
  AiSkillsScope,
  AiSkillsTarget,
  getAiSkillsFolder,
  getAiSkillsFolderLabel,
  getOutdatedAiSkillsFolders,
  installAiSkills,
} from '../utils/aiSkills';
import { Extension } from './Extension';
import { Logger } from './Logger';
import { Notifications } from './Notifications';

interface TargetPickItem extends QuickPickItem {
  target: AiSkillsTarget;
}

interface ScopePickItem extends QuickPickItem {
  scope: AiSkillsScope;
}

/**
 * Installs the AI skills that the extension bundles (`skills/`) for AI assistants that don't read
 * the `chatSkills` contribution point, like Claude Code in the terminal, and offers to update them
 * after an update of the extension.
 */
export class AiSkillsService {
  public static register() {
    const ext = Extension.getInstance();
    ext.subscriptions.push(
      commands.registerCommand(COMMAND.installAiSkills, AiSkillsService.install),
    );

    void AiSkillsService.checkForUpdates();
  }

  private static get bundledFolder(): string {
    return join(Extension.getInstance().extensionPath, 'skills');
  }

  private static get workspaceRoot(): string | undefined {
    return Extension.getInstance().workspaceFolder?.uri.fsPath;
  }

  private static async install() {
    const workspaceRoot = AiSkillsService.workspaceRoot;
    const home = homedir();

    const targets = await window.showQuickPick<TargetPickItem>(
      AI_SKILLS_TARGETS.map((target) => ({
        label: target.label,
        description: `${target.projectFolder} · ~/${target.userFolder}`,
        detail:
          target.tool === 'copilot'
            ? 'Copilot in VS Code already includes the skills. Install them for the Copilot CLI or to share them with your team.'
            : undefined,
        target,
      })),
      {
        title: `${Config.title}: Install or update AI skills`,
        placeHolder: 'Select the AI assistants to install the Demo Time skills for',
        canPickMany: true,
        ignoreFocusOut: true,
      },
    );

    if (!targets || targets.length === 0) {
      return;
    }

    const scopes: ScopePickItem[] = [
      ...(workspaceRoot
        ? [
            {
              label: 'Project',
              description: 'In this workspace, to share them through source control',
              scope: 'project' as AiSkillsScope,
            },
          ]
        : []),
      {
        label: 'User',
        description: 'In your home folder, for all your projects',
        scope: 'user' as AiSkillsScope,
      },
    ];

    const scope = await window.showQuickPick<ScopePickItem>(scopes, {
      title: `${Config.title}: Install or update AI skills`,
      placeHolder: 'Where do you want to install the skills?',
      ignoreFocusOut: true,
    });

    if (!scope) {
      return;
    }

    const folders = targets.map(({ target }) =>
      getAiSkillsFolder(target, scope.scope, workspaceRoot ?? '', home),
    );
    await AiSkillsService.installInFolders(folders, 'Installed');
  }

  private static async installInFolders(folders: string[], verb: 'Installed' | 'Updated') {
    const ext = Extension.getInstance();
    const workspaceRoot = AiSkillsService.workspaceRoot;
    const home = homedir();

    try {
      let skills: string[] = [];
      for (const folder of folders) {
        skills = await installAiSkills(AiSkillsService.bundledFolder, folder, ext.version);
      }

      const labels = folders.map((folder) => getAiSkillsFolderLabel(folder, workspaceRoot, home));
      Notifications.info(`${verb} the AI skills (${skills.join(', ')}) in ${labels.join(', ')}.`);
    } catch (error) {
      Logger.error(`Failed to install the AI skills: ${(error as Error).message}`);
      Notifications.error(`Failed to install the AI skills: ${(error as Error).message}`);
    }
  }

  /**
   * Offers to update the AI skills that an older version of the extension installed.
   */
  private static async checkForUpdates() {
    const ext = Extension.getInstance();
    const globalState = ext.context.globalState;
    if (globalState.get<string>(StateKeys.aiSkillsUpdateDismissed) === ext.version) {
      return;
    }

    const workspaceRoot = AiSkillsService.workspaceRoot;
    const home = homedir();
    const scopes: AiSkillsScope[] = workspaceRoot ? ['project', 'user'] : ['user'];
    const folders = [
      ...new Set(
        AI_SKILLS_TARGETS.flatMap((target) =>
          scopes.map((scope) => getAiSkillsFolder(target, scope, workspaceRoot ?? '', home)),
        ),
      ),
    ];

    try {
      const outdated = await getOutdatedAiSkillsFolders(folders, ext.version);
      if (outdated.length === 0) {
        return;
      }

      const labels = outdated.map((folder) => getAiSkillsFolderLabel(folder, workspaceRoot, home));
      const update = 'Update';
      const skip = 'Skip this version';
      const answer = await Notifications.info(
        `The Demo Time AI skills in ${labels.join(', ')} are from another version of the extension. Update them to version ${ext.version}?`,
        update,
        skip,
      );

      if (answer === update) {
        await AiSkillsService.installInFolders(outdated, 'Updated');
      } else if (answer === skip) {
        await globalState.update(StateKeys.aiSkillsUpdateDismissed, ext.version);
      }
    } catch (error) {
      Logger.error(`Failed to check the installed AI skills: ${(error as Error).message}`);
    }
  }
}
