import { commands, FileType, ProgressLocation, Uri, window, workspace } from 'vscode';
import { Action, DemoFile, Subscription } from '../models';
import { Extension } from './Extension';
import { General } from '../constants';
import { Notifications } from './Notifications';
import { createImageSlide, parseWinPath } from '../utils';
import { COMMAND } from '@demotime/common';

export class ImportService {
  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(
      commands.registerCommand(
        COMMAND.importPowerPointImages,
        ImportService.importPowerPointImages,
      ),
    );
  }

  private static async importPowerPointImages() {
    // Ask the user to select the PowerPoint folder
    const selectedFolder = await window.showOpenDialog({
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select folder with PowerPoint exported slide images',
    });

    if (!selectedFolder || selectedFolder.length === 0) {
      Notifications.error('No folder selected.');
      return;
    }

    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: 'Importing images...',
        cancellable: false,
      },
      async (_) => {
        const folderUri = selectedFolder[0];
        const wsFolder = Extension.getInstance().workspaceFolder;

        if (!wsFolder) {
          window.showErrorMessage('No workspace folder found.');
          return;
        }

        const files = await workspace.fs.readDirectory(folderUri);
        const imageFiles = files.filter(
          ([name, type]) => type === FileType.File && /\.(jpg|jpeg|png|gif)$/i.test(name),
        );
        if (imageFiles.length === 0) {
          Notifications.error('No image files found in the selected folder.');
          return;
        }

        const createNewDemoFile = await window.showInformationMessage(
          'Do you want to add the slides in a new demo file?',
          { modal: true, detail: 'This will create a new demo file with the slides.' },
          'Yes',
        );

        let imageUris = imageFiles.map(([name]) =>
          folderUri.with({ path: `${folderUri.path}/${name}` }),
        );
        imageUris = imageUris.sort((a, b) => {
          const nameA = a.path.split('/').pop() || '';
          const nameB = b.path.split('/').pop() || '';
          return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        });

        const slideFolder = Uri.joinPath(wsFolder.uri, General.demoFolder, General.slidesFolder);
        const slideFolderName = parseWinPath(folderUri.path).split('/').pop() || '';
        const newSlideFolder = Uri.joinPath(slideFolder, slideFolderName);

        try {
          await workspace.fs.createDirectory(newSlideFolder);
        } catch (error) {
          Notifications.error('Failed to create slide folder.');
          return;
        }

        let demo: DemoFile | undefined;
        if (createNewDemoFile === 'Yes') {
          demo = {
            $schema: 'https://demotime.show/demo-time.schema.json',
            title: slideFolderName,
            description: 'Imported from PowerPoint',
            demos: [],
          };
        }

        for (const [_, imageUri] of imageUris.entries()) {
          const imageName = imageUri.path.split('/').pop() || '';
          const imageNameWithoutExtension = imageName.split('.').slice(0, -1).join('.');
          const newImageUri = Uri.joinPath(newSlideFolder, 'images', imageName);

          try {
            await workspace.fs.copy(imageUri, newImageUri, {
              overwrite: true,
            });
          } catch (error) {
            Notifications.error(`Failed to copy image: ${imageUri.path}`);
            return;
          }

          try {
            const slidePath = await createImageSlide(newImageUri, newSlideFolder);

            if (slidePath && demo && demo.demos) {
              demo.demos.push({
                title: imageNameWithoutExtension,
                description: '',
                icons: {
                  start: 'vm',
                  end: 'pass-filled',
                },
                steps: [{ action: Action.OpenSlide, path: slidePath }],
              });
            }
          } catch (error) {
            Notifications.error(`Failed to create slide for image: ${imageUri.path}`);
            return;
          }
        }

        if (demo) {
          const demoFileUri = Uri.joinPath(
            wsFolder.uri,
            General.demoFolder,
            `${slideFolderName}.json`,
          );
          try {
            await workspace.fs.writeFile(
              demoFileUri,
              new TextEncoder().encode(JSON.stringify(demo, null, 2)),
            );
            await window.showTextDocument(demoFileUri, { preview: false });
          } catch (error) {
            Notifications.error('Failed to create demo file.');
            return;
          }
        }

        Notifications.info('Slides created successfully!');
      },
    );
  }
}
