import fs from 'node:fs/promises';
import path from 'node:path';
import { root } from './lib.mjs';

const dist = path.join(root, 'dist');
const required = ['index.html', 'publications/index.html', 'cv/index.html'];
if (process.argv.includes('--require-cv')) required.push('cv/SotoAnno_CV.pdf');
for (const relative of required) await fs.access(path.join(dist, relative));
const htmlFiles = [];
async function walk(directory) {
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    const itemPath = path.join(directory, item.name);
    if (item.isDirectory()) await walk(itemPath);
    else if (item.name.endsWith('.html')) htmlFiles.push(itemPath);
  }
}
for (const file of htmlFiles) {
  const html = await fs.readFile(file, 'utf8');

  const staleBaseRefs = [
    ...html.matchAll(/(?:href|src)="\/s0t00524\/[^"]*"/g),
  ];

  if (staleBaseRefs.length) {
    throw new Error(
      `${path.relative(root, file)} contains stale /s0t00524/ URLs: ` +
      staleBaseRefs.map((match) => match[0]).join(', ')
    );
  }
}

console.log(
  `Build check passed for ${htmlFiles.length} HTML files at site root.`
);