const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../apps/webviews/dist');
const destDir = path.resolve(__dirname, '../apps/vscode-extension/webviews');

function emptyDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    const curPath = path.join(dir, file);
    if (fs.lstatSync(curPath).isDirectory()) {
      emptyDir(curPath);
      fs.rmdirSync(curPath);
    } else {
      fs.unlinkSync(curPath);
    }
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Empty destination folder
emptyDir(destDir);
// Copy files from source to destination
copyDir(srcDir, destDir);

console.log(`Copied webviews from ${srcDir} to ${destDir}`);

const htmlFile = path.join(destDir, 'index.html');
const webviewHtmlTs = path.resolve(__dirname, '../apps/vscode-extension/src/webview/WebviewHtml.ts');

if (fs.existsSync(htmlFile)) {
  const htmlContent = fs.readFileSync(htmlFile, 'utf8');
  const tsContent = `export const WebviewHtml = \`${htmlContent.replace(/`/g, '\\`')}\`;\n`;
  fs.writeFileSync(webviewHtmlTs, tsContent, 'utf8');
  console.log(`Updated WebviewHtml.ts with new HTML from ${htmlFile}`);
} else {
  console.warn(`HTML file not found at ${htmlFile}`);
}