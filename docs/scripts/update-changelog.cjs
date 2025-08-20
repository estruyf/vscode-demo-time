#!/usr/bin/env node

// update-changelog.js
// Fetches the latest CHANGELOG.md from GitHub and updates the local changelog.md (removing the first '# Changelog' heading)

const https = require('https');
const fs = require('fs');
const path = require('path');

const GITHUB_CHANGELOG_URL = 'https://raw.githubusercontent.com/estruyf/vscode-demo-time/main/CHANGELOG.md';
const LOCAL_CHANGELOG_PATH = path.resolve(__dirname, '../changelog.md');

https.get(GITHUB_CHANGELOG_URL, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Remove the first '# Changelog' heading if present
    const cleaned = data.replace(/^# Changelog\s*/i, '').replace(/^# Change Log\s*/i, '');
    fs.writeFileSync(LOCAL_CHANGELOG_PATH, cleaned.trimStart() + '\n');
    console.log('changelog.md updated from GitHub.');
  });
}).on('error', (err) => {
  console.error('Failed to fetch changelog:', err);
  process.exit(1);
});
