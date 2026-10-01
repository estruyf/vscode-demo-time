import { cpSync, symlinkSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

/**
 * Copies the workspace so the recording starts from the same files every time and what a scene
 * writes doesn't land in the real workspace. `.git` and the `exclude` folders are left out.
 * Symbolic links are copied as what they point to, so a write through one can't reach the
 * original. `node_modules` folders are linked rather than copied, which is fast and keeps the
 * demo's scripts running, but a demo that installs packages then changes the real ones;
 * `copyNodeModules` copies them as well.
 */
export const copyWorkspace = (
  source: string,
  target: string,
  exclude: string[] = [],
  options: { copyNodeModules?: boolean } = {},
): void => {
  const links: string[] = [];
  const isExcluded = (path: string) =>
    exclude.some((folder) => path === folder || path.startsWith(folder + sep));

  cpSync(source, target, {
    recursive: true,
    dereference: true,
    filter: (path) => {
      const rel = relative(source, path);
      if (!rel) {
        return true;
      }
      const name = basename(path);
      if (name === '.git' || isExcluded(path)) {
        return false;
      }
      if (name === 'node_modules' && !options.copyNodeModules) {
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
