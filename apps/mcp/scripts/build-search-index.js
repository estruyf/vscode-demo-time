import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Fuse from 'fuse.js';

// Directory containing markdown files
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const docsDir = path.join(__dirname, '../../..', 'docs', 'src', 'content', 'docs');

/**
 * Recursively finds all Markdown files under the given directory and returns their paths relative to the module's docsDir.
 *
 * Traverses directories synchronously, collecting files that end with `.md` or `.mdx`. Returned paths are relative to `docsDir`.
 *
 * @param {string} dir - Absolute or relative directory path to start the recursive search.
 * @returns {string[]} Array of file paths (relative to `docsDir`) for all discovered `.md` and `.mdx` files.
 */
function getMarkdownFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getMarkdownFiles(filePath));
    } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
      // Store relative path from docsDir
      results.push(path.relative(docsDir, filePath));
    }
  });
  return results;
}

const files = getMarkdownFiles(docsDir);

// Parse files into data array
const data = files.map(filename => {
  const filePath = path.join(docsDir, filename);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content } = matter(fileContent);
  return {
    title: frontmatter.title || filename,
    description: frontmatter.description || '',
    content,
    slug: filename.replace(/\.mdx$/, ''),
  };
});

// Configure Fuse.js options
const options = {
  keys: ['title', 'content', 'description'],
  useExtendedSearch: true,
  ignoreLocation: true,
  threshold: 0.3,
  fieldNormWeight: 2,
};

// Build the index
const index = Fuse.createIndex(options.keys, data);

// Ensure output directory exists
const outputDir = path.join(__dirname, '..', 'searchindex');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the index and original data for searching
fs.writeFileSync(path.join(outputDir, 'index.json'), JSON.stringify(index));
fs.writeFileSync(path.join(outputDir, 'data.json'), JSON.stringify(data));

console.log('Search index built and saved to searchindex folder.');
