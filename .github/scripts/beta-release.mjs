import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';

const packageContents = await readFile('package.json', 'utf8');
const packageJson = JSON.parse(packageContents);
const version = packageJson.version.split('.');

packageJson.version = `${version[0]}.${version[1]}.${process.argv[
  process.argv.length - 1
].substring(0, 9)}`;

await core.summary.addHeading(`Version info`).addRaw(`Version: ${packageJson.version}`).write();

fs.writeFileSync(
  path.join(path.resolve('.'), 'package.json'),
  JSON.stringify(packageJson, null, 2)
);
