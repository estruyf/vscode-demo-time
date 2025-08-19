import { promises as fs } from 'fs';
import path from 'path';

const sourceDir = path.join('src', 'preview', 'themes');
const destinationDir = path.join('assets', 'styles', 'themes');

async function copyFiles(src, dest) {
  try {
    await fs.mkdir(dest, { recursive: true });
    const files = await fs.readdir(src);

    for (const file of files) {
      const srcFile = path.join(src, file);
      const destFile = path.join(dest, file);
      const stat = await fs.stat(srcFile);

      if (stat.isFile()) {
        await fs.copyFile(srcFile, destFile);
        console.log(`Copied: ${srcFile} -> ${destFile}`);
      }
    }
  } catch (error) {
    console.error('Error copying files:', error);
  }
}

copyFiles(sourceDir, destinationDir);