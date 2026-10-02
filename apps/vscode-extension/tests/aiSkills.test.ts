import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  AI_SKILL_MARKER,
  AI_SKILLS_TARGETS,
  getAiSkillNames,
  getAiSkillsFolder,
  getAiSkillsFolderLabel,
  getInstalledAiSkills,
  getOutdatedAiSkillsFolders,
  installAiSkills,
} from '../src/utils/aiSkills';

const writeSkill = (folder: string, name: string, files: Record<string, string> = {}) => {
  mkdirSync(join(folder, name), { recursive: true });
  writeFileSync(join(folder, name, 'SKILL.md'), `---\nname: ${name}\n---\n`);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(folder, name, file, '..'), { recursive: true });
    writeFileSync(join(folder, name, file), content);
  }
};

describe('aiSkills', () => {
  let root: string;
  let bundled: string;
  let target: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'demotime-skills-'));
    bundled = join(root, 'bundled');
    target = join(root, 'target');
    writeSkill(bundled, 'demotime-slides', { 'references/layouts.md': '# Layouts' });
    writeSkill(bundled, 'demotime-code-demo');
    mkdirSync(join(bundled, 'not-a-skill'), { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('resolves the project and user skills folders', () => {
    const claude = AI_SKILLS_TARGETS.find((t) => t.tool === 'claude')!;
    const copilot = AI_SKILLS_TARGETS.find((t) => t.tool === 'copilot')!;

    expect(getAiSkillsFolder(claude, 'project', '/ws', '/home/me')).toBe(
      join('/ws', '.claude', 'skills'),
    );
    expect(getAiSkillsFolder(copilot, 'project', '/ws', '/home/me')).toBe(
      join('/ws', '.github', 'skills'),
    );
    expect(getAiSkillsFolder(copilot, 'user', '/ws', '/home/me')).toBe(
      join('/home/me', '.copilot', 'skills'),
    );
  });

  it('labels folders relative to the workspace or the home folder', () => {
    expect(getAiSkillsFolderLabel(join('/ws', '.claude', 'skills'), '/ws', '/home/me')).toBe(
      '.claude/skills',
    );
    expect(getAiSkillsFolderLabel(join('/home/me', '.claude', 'skills'), '/ws', '/home/me')).toBe(
      '~/.claude/skills',
    );
    expect(getAiSkillsFolderLabel('/other/skills', undefined, '/home/me')).toBe('/other/skills');
  });

  it('only lists demotime-* folders with a SKILL.md', async () => {
    expect(await getAiSkillNames(bundled)).toEqual(['demotime-code-demo', 'demotime-slides']);
    expect(await getAiSkillNames(join(root, 'missing'))).toEqual([]);
  });

  it('installs the skills with their files and a version marker', async () => {
    const installed = await installAiSkills(bundled, target, '2.4.0');

    expect(installed).toEqual(['demotime-code-demo', 'demotime-slides']);
    expect(readFileSync(join(target, 'demotime-slides', 'references', 'layouts.md'), 'utf8')).toBe(
      '# Layouts',
    );
    expect(
      JSON.parse(readFileSync(join(target, 'demotime-slides', AI_SKILL_MARKER), 'utf8')),
    ).toEqual({ version: '2.4.0' });
    expect(await getInstalledAiSkills(target)).toEqual([
      { name: 'demotime-code-demo', version: '2.4.0' },
      { name: 'demotime-slides', version: '2.4.0' },
    ]);
  });

  it('replaces only the Demo Time skills and removes the ones that no longer exist', async () => {
    writeSkill(target, 'my-own-skill');
    writeSkill(target, 'demotime-old-skill');
    writeFileSync(join(target, 'demotime-old-skill', AI_SKILL_MARKER), '{ "version": "2.3.0" }');
    writeSkill(target, 'demotime-manual-skill');
    writeSkill(target, 'demotime-slides', { 'stale.md': 'old' });

    await installAiSkills(bundled, target, '2.4.0');

    expect(existsSync(join(target, 'my-own-skill', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(target, 'demotime-manual-skill', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(target, 'demotime-old-skill'))).toBe(false);
    expect(existsSync(join(target, 'demotime-slides', 'stale.md'))).toBe(false);
  });

  it('fails when there are no bundled skills', async () => {
    await expect(installAiSkills(join(root, 'empty'), target, '2.4.0')).rejects.toThrow(
      'No AI skills found',
    );
  });

  it('finds the folders with skills of another version', async () => {
    const current = join(root, 'current');
    const old = join(root, 'old');
    const manual = join(root, 'manual');
    await installAiSkills(bundled, current, '2.4.0');
    await installAiSkills(bundled, old, '2.3.0');
    writeSkill(manual, 'demotime-slides');

    expect(
      await getOutdatedAiSkillsFolders([current, old, manual, join(root, 'missing')], '2.4.0'),
    ).toEqual([old]);
  });
});
