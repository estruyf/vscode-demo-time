#!/usr/bin/env node
import { parseExportArgs, USAGE } from './args';
import { exportVideo, Reporter } from './export';

const reporter: Reporter = {
  step: (message) => console.log(`\n${message}…`),
  info: (message) => console.log(message),
  warn: (message) => console.warn(`  ⚠ ${message}`),
};

const main = async (argv: string[]): Promise<number> => {
  const [command, ...rest] = argv;
  if (!command || command === '-h' || command === '--help') {
    console.log(USAGE);
    return 0;
  }
  if (command !== 'export') {
    console.error(`Unknown command "${command}".\n\n${USAGE}`);
    return 1;
  }

  const options = parseExportArgs(rest);
  if (!options) {
    console.log(USAGE);
    return 0;
  }

  const started = Date.now();
  const { files, timeline } = await exportVideo(options, reporter);
  console.log(
    `\nDone in ${Math.round((Date.now() - started) / 1000)}s: ` +
      `${timeline.scenes.length} scene(s), ${(timeline.duration / 1000).toFixed(1)}s of play.`,
  );
  for (const file of files) {
    console.log(`  ${file}`);
  }
  return 0;
};

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error: Error) => {
    console.error(`\n✖ ${error.message}`);
    process.exit(1);
  },
);
