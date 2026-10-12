import { mkdirSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

// Twice the article's 672px measure: sharp on a retina screen, no heavier than that.
const MAX_WIDTH = 1344;

const [slug, source, name] = process.argv.slice(2);
if (!slug || !source) {
  console.error('Usage: pnpm image <post-slug> <image-path> [name]');
  process.exit(1);
}

const isRetina = /@2x\.\w+$/.test(source);
const baseName = slugify(name ?? path.parse(source).name.replace(/@2x$/, ''));
const fileName = `${baseName}${isRetina ? '@2x' : ''}.webp`;
const outDir = path.join('public/images/blog', slug);
mkdirSync(outDir, { recursive: true });

const { width, height } = await sharp(source)
  .rotate()
  .resize({ width: MAX_WIDTH, withoutEnlargement: true })
  .webp({ quality: 85 })
  .toFile(path.join(outDir, fileName));

console.log(`Saved ${path.join(outDir, fileName)} (${width}x${height})\n`);
console.log(`![圖片說明](/images/blog/${slug}/${fileName})`);

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-|-$/g, '') || 'image'
  );
}
