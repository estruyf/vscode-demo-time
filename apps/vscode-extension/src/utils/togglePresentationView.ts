import { commands, workspace } from 'vscode';
import { Config } from '@demotime/common';
import { Extension } from '../services';
import { StateKeys } from '../constants';
import { updateConfig } from './updateConfig';

export const togglePresentationView = async (enable?: boolean) => {
  const defaultToggles = ['statusBar', 'tabs', 'activityBar', 'sideBar', 'panel'] as const;
  type PresentationToggle = (typeof defaultToggles)[number];

  const isKnownToggle = (value: string): value is PresentationToggle =>
    defaultToggles.includes(value as PresentationToggle);

  const configuredToggles =
    Extension.getInstance()
      .getSetting<string[]>(Config.presentationMode.viewToggles)
      ?.filter(isKnownToggle) || [];

  const toggles: PresentationToggle[] = configuredToggles.length
    ? configuredToggles
    : [...defaultToggles];

  const config = workspace.getConfiguration();
  const statusBar = 'workbench.statusBar.visible';
  const tabs = 'workbench.editor.showTabs';
  const activityBar = 'workbench.activityBar.location';

  const statusBarValue = config.get(statusBar);
  const tabsValue = config.get(tabs);
  const activityBarValue = config.get(activityBar);

  const currentValues = {
    statusBar: statusBarValue,
    tabs: tabsValue,
    activityBar: activityBarValue,
  };

  let previousValues = {
    ...currentValues,
    toggles,
  };

  // If these values are set, it means that the presentation view is enabled
  const isPresentationViewEnabled = toggles.every((toggle) => {
    if (toggle === 'statusBar') {
      return statusBarValue === false;
    }

    if (toggle === 'tabs') {
      return tabsValue === 'none';
    }

    if (toggle === 'activityBar') {
      return activityBarValue === 'hidden';
    }

    return true;
  });

  if (isPresentationViewEnabled) {
    const storedValues = Extension.getInstance().getState<typeof previousValues>(
      StateKeys.presentationView,
    );
    const storedTogglesMatch =
      storedValues?.toggles?.length === toggles.length &&
      storedValues.toggles.every((toggle) => toggles.includes(toggle));

    previousValues = storedTogglesMatch ? storedValues : previousValues;
  } else {
    await Extension.getInstance().setState(StateKeys.presentationView, previousValues);
  }

  const showGetEnabled =
    (!isPresentationViewEnabled && typeof enable === 'undefined') || enable === true;

  if (showGetEnabled) {
    if (toggles.includes('sideBar')) {
      await commands.executeCommand('workbench.action.closeSidebar');
    }

    if (toggles.includes('panel')) {
      await commands.executeCommand('workbench.action.closePanel');
    }
  }

  if (toggles.includes('statusBar')) {
    await updateConfig(
      statusBar,
      showGetEnabled ? false : (previousValues?.statusBar ?? undefined),
    );
  }

  if (toggles.includes('tabs')) {
    await updateConfig(tabs, showGetEnabled ? 'none' : (previousValues?.tabs ?? undefined));
  }

  if (toggles.includes('activityBar')) {
    await updateConfig(
      activityBar,
      showGetEnabled ? 'hidden' : (previousValues?.activityBar ?? undefined),
    );
  }
  return;
};
