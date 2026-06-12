#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootPkgPath = path.join(__dirname, '..', 'package.json');
const extPkgPath = path.join(__dirname, '..', 'apps', 'vscode-extension', 'package.json');

function syncVersion() {
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  const extPkg = JSON.parse(fs.readFileSync(extPkgPath, 'utf8'));

  if (!rootPkg.version) {
    console.error('Root package.json has no version');
    process.exit(1);
  }

  if (extPkg.version === rootPkg.version) {
    console.log('Versions already in sync:', rootPkg.version);
    return;
  }

  extPkg.version = rootPkg.version;
  fs.writeFileSync(extPkgPath, JSON.stringify(extPkg, null, 2) + '\n', 'utf8');
  console.log(`Synced version ${rootPkg.version} -> apps/vscode-extension/package.json`);
}

syncVersion();
