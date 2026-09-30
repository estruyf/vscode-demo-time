import { find, save } from '../src/store.ts';

const urls = [
  'https://demotime.show/actions/',
  'https://code.visualstudio.com/docs',
  'https://nodejs.org/en/learn',
];

for (const url of urls) {
  const link = save(url);
  console.log(`  /${link.code}  →  ${find(link.code)?.url}`);
}
console.log(`\n✔ ${urls.length} links shortened and resolved`);
