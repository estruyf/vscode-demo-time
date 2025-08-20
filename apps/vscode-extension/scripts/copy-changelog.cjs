#!/usr/bin/env node

// update-changelog.js
// Copies the latest CHANGELOG.md from the project root to docs/changelog.md (removing the first '# Changelog' heading)

const fs = require('fs');
const path = require('path');

const ROOT_CHANGELOG_PATH = path.resolve(__dirname, '../../CHANGELOG.md');
const LOCAL_CHANGELOG_PATH = path.resolve(__dirname, '../changelog.md');

try {
  const data = fs.readFileSync(ROOT_CHANGELOG_PATH, 'utf8');
  // Remove the first '# Changelog' heading if present
  const cleaned = data.replace(/^# Changelog\s*/i, '').replace(/^# Change Log\s*/i, '');
  fs.writeFileSync(LOCAL_CHANGELOG_PATH, cleaned.trimStart() + '\n');
  console.log('changelog.md updated from root folder.');
} catch (err) {
  console.error('Failed to update changelog:', err);
  process.exit(1);
}
