/**
 * Entry point of `skills/demotime-slide-theme/scripts/build-theme.mjs`.
 *
 * Bundled by `scripts/skills/build-skills.mjs`. It reuses the Theme Builder's own model and CSS
 * generator, so a theme created by an AI assistant is the same CSS the Theme Builder exports,
 * including the embedded model that lets the Theme Builder import it without losing anything.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { normalizeModel } from '../../apps/webviews/src/utils/theme-builder/defaultTheme';
import { generateCss, sanitizeName } from '../../apps/webviews/src/utils/theme-builder/generateCss';
import { parseCss } from '../../apps/webviews/src/utils/theme-builder/parseCss';
import { getPreset, PRESETS } from '../../apps/webviews/src/utils/theme-builder/presets';
import { PRESET_CSS } from '../../apps/webviews/src/utils/theme-builder/presetCss.generated';

const USAGE = `Demo Time slide theme builder

Usage:
  node build-theme.mjs <model.json> [--out <file.css>]
      Generate the theme CSS from a theme model. Writes to .demo/theme/<name>.css by default.
  node build-theme.mjs --preset <id>
      Print the model of a Theme Builder preset to start from.
      Presets: ${PRESETS.map((p) => p.id).join(', ')}
  node build-theme.mjs --read <theme.css>
      Print the model of an existing theme CSS file (lossless for Theme Builder themes).
`;

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function getArg(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) {
    return undefined;
  }
  const value = args[idx + 1];
  if (!value || value.startsWith('--')) {
    fail(`Missing value for ${name}`);
  }
  return value;
}

function printModel(model: unknown) {
  process.stdout.write(`${JSON.stringify(model, null, 2)}\n`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    process.stdout.write(USAGE);
    return;
  }

  const presetId = getArg(args, '--preset');
  if (presetId) {
    const preset = getPreset(presetId);
    if (!preset) {
      fail(`Unknown preset "${presetId}". Use one of: ${PRESETS.map((p) => p.id).join(', ')}`);
    }
    printModel(preset.create());
    return;
  }

  const cssPath = getArg(args, '--read');
  if (cssPath) {
    const result = parseCss(readFileSync(resolve(cssPath), 'utf8'));
    for (const warning of result.warnings) {
      process.stderr.write(`Warning: ${warning}\n`);
    }
    printModel(result.model);
    return;
  }

  const modelPath = args.find((arg, idx) => !arg.startsWith('--') && args[idx - 1] !== '--out');
  if (!modelPath) {
    fail(USAGE);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(resolve(modelPath), 'utf8'));
  } catch (error) {
    fail(`Could not read the theme model "${modelPath}": ${(error as Error).message}`);
  }

  const model = normalizeModel(raw);
  if (!model) {
    fail('The theme model must be a JSON object.');
  }

  if (model.basedOn && !PRESET_CSS[model.basedOn]) {
    fail(
      `Unknown "basedOn" design "${model.basedOn}". Use one of: ${Object.keys(PRESET_CSS).join(', ')}, or remove it for a theme from scratch.`,
    );
  }

  model.name = sanitizeName(model.name);
  const outPath = resolve(getArg(args, '--out') ?? `.demo/theme/${model.name}.css`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, generateCss(model), 'utf8');

  process.stdout.write(
    `Theme "${model.displayName || model.name}" written to ${outPath}\nUse it in a slide with "theme: ${model.name}" and load the CSS with the "customTheme" front matter property or the "demoTime.customTheme" setting.\n`,
  );
}

main();
