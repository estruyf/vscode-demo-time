import { cpSync, symlinkSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

/**
 * Copies the workspace so the recording starts from the same files every time and nothing a
 * scene writes lands in the real workspace. `.git` and the `exclude` folders are left out, and
 * `node_modules` folders are linked rather than copied: fast, and scripts in the demo still run.
 */
export const copyWorkspace = (source: string, target: string, exclude: string[] = []): void => {
  const links: string[] = [];
  const isExcluded = (path: string) =>
    exclude.some((folder) => path === folder || path.startsWith(folder + sep));

  cpSync(source, target, {
    recursive: true,
    filter: (path) => {
      const rel = relative(source, path);
      if (!rel) {
        return true;
      }
      const name = basename(path);
      if (name === '.git' || isExcluded(path)) {
        return false;
      }
      if (name === 'node_modules') {
        links.push(rel);
        return false;
      }
      return true;
    },
  });

  for (const rel of links) {
    symlinkSync(
      join(source, rel),
      join(target, rel),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  }
};
