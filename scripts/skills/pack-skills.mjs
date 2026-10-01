#!/usr/bin/env node
/**
 * Packs the built Demo Time AI skills as a Claude Code plugin in `dist/demotime-skills.zip`.
 *
 * The release workflow attaches the zip to the GitHub release, and the plugin marketplace in
 * `.claude-plugin/marketplace.json` installs it from there. People who use other assistants can
 * download it and copy the skill folders.
 *
 * Run `build-skills.mjs` first, it generates the references and scripts of the skills.
 *
 * Zip layout:
 *   .claude-plugin/plugin.json   name and version (the extension version)
 *   skills/demotime-<skill>/     one folder per skill
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const SOURCE = join(ROOT, 'skills');
const DIST = join(ROOT, 'dist');
const STAGING = join(DIST, 'demotime-skills');
const ZIP = join(DIST, 'demotime-skills.zip');

const { version } = JSON.parse(
  readFileSync(join(ROOT, 'apps', 'vscode-extension', 'package.json'), 'utf8'),
);

const skills = readdirSync(SOURCE, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(SOURCE, entry.name, 'SKILL.md')))
  .map((entry) => entry.name)
  .sort();

for (const skill of skills) {
  if (!existsSync(join(SOURCE, skill, 'references'))) {
    console.error(`skills/${skill} has no references. Run scripts/skills/build-skills.mjs first.`);
    process.exit(1);
  }
}

rmSync(STAGING, { recursive: true, force: true });
rmSync(ZIP, { force: true });
mkdirSync(join(STAGING, '.claude-plugin'), { recursive: true });

for (const skill of skills) {
  cpSync(join(SOURCE, skill), join(STAGING, 'skills', skill), { recursive: true });
}

const manifest = {
  name: 'presentation-skills',
  displayName: 'Demo Time presentation skills',
  version,
  description:
    'Skills to plan a talk, create Demo Time slides and slide themes, and script live coding demos as Demo Time acts.',
  author: { name: 'Elio Struyf', url: 'https://www.eliostruyf.com' },
  homepage: 'https://demotime.show/features/ai-skills/',
  repository: 'https://github.com/estruyf/vscode-demo-time',
  license: 'Apache-2.0',
  keywords: ['demo-time', 'presentation', 'slides', 'live-coding', 'vscode'],
};
writeFileSync(
  join(STAGING, '.claude-plugin', 'plugin.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

try {
  execFileSync('zip', ['-r', '-q', '-X', ZIP, '.claude-plugin', 'skills'], { cwd: STAGING });
} catch (error) {
  console.error(`Could not create the zip with the "zip" command: ${error.message}`);
  process.exit(1);
}

console.log(`Packed ${skills.length} AI skills (version ${version}) in ${relative(ROOT, ZIP)}`);
