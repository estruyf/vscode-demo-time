#!/usr/bin/env node
/**
 * Copies the Demo Time AI skills from `skills/` into the extension, which contributes them with the
 * `chatSkills` contribution point and installs them with the `Demo Time: Install or update AI
 * skills` command.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const SOURCE = join(ROOT, 'skills');
const TARGET = join(ROOT, 'apps', 'vscode-extension', 'skills');

rmSync(TARGET, { recursive: true, force: true });
mkdirSync(TARGET, { recursive: true });

const skills = readdirSync(SOURCE, { withFileTypes: true }).filter(
  (entry) =>
    entry.isDirectory() &&
    entry.name.startsWith('demotime-') &&
    existsSync(join(SOURCE, entry.name, 'SKILL.md')),
);

for (const skill of skills) {
  cpSync(join(SOURCE, skill.name), join(TARGET, skill.name), { recursive: true });
}

console.log(`Copied ${skills.length} AI skills to apps/vscode-extension/skills`);
