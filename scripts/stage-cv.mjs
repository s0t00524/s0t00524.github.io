import fs from 'node:fs/promises';
import path from 'node:path';
import { root } from './lib.mjs';

const target = path.join(root, 'dist/cv/SotoAnno_CV.pdf');
await fs.mkdir(path.dirname(target), { recursive: true });
await fs.copyFile(path.join(root, 'SotoAnno_CV.pdf'), target);
console.log('CV staged in dist/cv/SotoAnno_CV.pdf');
