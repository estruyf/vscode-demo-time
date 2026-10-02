import {
  Config,
  SETTING_CATEGORIES,
  SETTINGS_CATALOG,
  SETTINGS_NOT_IN_VIEW,
} from '@demotime/common';
import { readFileSync } from 'fs';
import { join } from 'path';

const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

const getContributedSettings = (): Record<string, { scope?: string }> => {
  const configuration = packageJson.contributes.configuration as
    | { properties: Record<string, { scope?: string }> }
    | { properties: Record<string, { scope?: string }> }[];
  const sections = Array.isArray(configuration) ? configuration : [configuration];
  return Object.assign({}, ...sections.map((section) => section.properties));
};

const toKey = (setting: string) => setting.replace(`${Config.root}.`, '');

describe('settings catalog', () => {
  const contributed = getContributedSettings();
  const inView = SETTINGS_CATALOG.filter((setting) => !setting.secret).map(
    (setting) => setting.key,
  );

  it('shows every contributed setting in the settings view', () => {
    const missing = Object.keys(contributed)
      .map(toKey)
      .filter((key) => !inView.includes(key as never) && !SETTINGS_NOT_IN_VIEW.includes(key));
    expect(missing).toEqual([]);
  });

  it('only lists contributed settings', () => {
    const unknown = inView.filter((key) => !contributed[`${Config.root}.${key}`]);
    expect(unknown).toEqual([]);
  });

  it('lists every setting once', () => {
    expect(new Set(inView).size).toBe(inView.length);
  });

  it('saves machine scoped settings in the user settings', () => {
    for (const setting of SETTINGS_CATALOG.filter((item) => !item.secret)) {
      const scope = contributed[`${Config.root}.${setting.key}`]?.scope;
      expect({ key: setting.key, userSettings: !!setting.userSettings }).toEqual({
        key: setting.key,
        userSettings: scope === 'machine' || scope === 'application',
      });
    }
  });

  it('puts every setting in a known category', () => {
    const categories = SETTING_CATEGORIES.map((category) => category.id);
    for (const setting of SETTINGS_CATALOG) {
      expect(categories).toContain(setting.category);
    }
  });
});
