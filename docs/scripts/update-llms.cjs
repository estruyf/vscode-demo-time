#!/usr/bin/env node
const fs=require('fs');
const path=require('path');

const docsDir=path.resolve('src','content','docs');
const baseUrl='https://demotime.show/';

function parseFrontMatter(content){
  const match=content.match(/^---\n([\s\S]*?)\n---/);
  const data={};
  if(match){
    const lines=match[1].split(/\n/);
    for(const line of lines){
      const idx=line.indexOf(':');
      if(idx>-1){
        const key=line.slice(0,idx).trim();
        const val=line.slice(idx+1).trim();
        data[key]=val;
      }
    }
  }
  return data;
}

function walk(rel, results){
  const dir=path.join(docsDir, rel);
  for(const name of fs.readdirSync(dir)){
    const fp=path.join(dir, name);
    const stat=fs.statSync(fp);
    if(stat.isDirectory()){
      walk(path.join(rel, name), results);
    } else if(name.endsWith('.md') || name.endsWith('.mdx')){
      let slug=path.join(rel, name).replace(/\\/g,'/').replace(/\.mdx?$/,'');
      if(slug==='index') continue;
      if(slug.endsWith('/index')) slug=slug.slice(0,-6);
      const content=fs.readFileSync(fp,'utf8');
      const fm=parseFrontMatter(content);
      results.push({slug, title: fm.title||slug, desc: fm.description||''});
    }
  }
}

const docs=[];
walk('', docs);

docs.sort((a,b)=>a.slug.localeCompare(b.slug));

const categories={};
for(const doc of docs){
  const cat=doc.slug.split('/')[0];
  (categories[cat]=categories[cat]||[]).push(doc);
}

function capitalize(str){return str.charAt(0).toUpperCase()+str.slice(1);}

let lines=[
  '# Demo Time - Live demos & slides in VS Code',
  '',
  '> Script your coding demos to perfection with this VS Code extension - no typos, no missteps, just flawless, stress-free presentations every time.',
  ''
];

Object.keys(categories).sort().forEach(cat=>{
  lines.push(`## ${capitalize(cat)}`);
  lines.push('');
  categories[cat].forEach(({slug,title,desc})=>{
    lines.push(`- [${title} | Demo Time](${baseUrl}${slug}/): ${desc}`);
  });
  lines.push('');
});

fs.writeFileSync(path.join('public','llms.txt'), lines.join('\n'));
console.log('llms.txt updated');
