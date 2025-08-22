import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Fuse from 'fuse.js';
import { fileURLToPath } from 'url';  

// Directory containing markdown files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.join(__dirname, '../../..', 'docs', 'src', 'content', 'docs');

// Read all markdown files
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
    slug: filename.replace(/\.(md|mdx)$/, ''),
  };
});

// Configure Fuse.js options
const options = {
  keys: ['title', 'content', 'description', 'slug'],
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
fs.writeFileSync(path.join(outputDir, 'index.json'), index.toJSON(), "utf-8");
fs.writeFileSync(path.join(outputDir, 'data.json'), JSON.stringify(data));

console.log('Search index built and saved to searchindex folder.');
