import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { root } from './lib.mjs';

const buildDir = path.join(root, 'cv/build');
await fs.mkdir(buildDir, { recursive: true });
const result = spawnSync('latexmk', ['-xelatex', '-interaction=nonstopmode', '-halt-on-error', '-outdir=build', 'SotoAnno_CV.tex'], {
  cwd: path.join(root, 'cv'), stdio: 'inherit', encoding: 'utf8',
});
if (result.error) {
  console.error(`Unable to start latexmk: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);
await fs.copyFile(path.join(buildDir, 'SotoAnno_CV.pdf'), path.join(root, 'SotoAnno_CV.pdf'));
const publicCv = path.join(root, 'public/cv/SotoAnno_CV.pdf');
await fs.mkdir(path.dirname(publicCv), { recursive: true });
await fs.copyFile(path.join(buildDir, 'SotoAnno_CV.pdf'), publicCv);
console.log('CV written to SotoAnno_CV.pdf and public/cv/SotoAnno_CV.pdf');
