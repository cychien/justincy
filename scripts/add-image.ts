import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

// Twice the article's 672px measure: sharp on a retina screen, no heavier than that.
const MAX_WIDTH = 1344;

const [slug, source, name] = process.argv.slice(2);
if (!slug || !source) {
  console.error('Usage: pnpm image <post-slug> <image-path> [name]');
  process.exit(1);
}

const CONTENT_DIR = 'app/content';
const sections = readdirSync(CONTENT_DIR).filter((section) =>
  existsSync(path.join(CONTENT_DIR, section, `${slug}.mdx`))
);
if (sections.length !== 1) {
  console.error(
    sections.length === 0
      ? `No post at ${CONTENT_DIR}/<section>/${slug}.mdx. The slug is the filename without .mdx.`
      : `${slug}.mdx is in more than one section: ${sections.join(', ')}.`
  );
  process.exit(1);
}
const imageUrl = `/images/${sections[0]}/${slug}`;

const isRetina = /@2x\.\w+$/.test(source);
const baseName = slugify(name ?? path.parse(source).name.replace(/@2x$/, ''));
const fileName = `${baseName}${isRetina ? '@2x' : ''}.webp`;
const outDir = path.join('public', imageUrl);
mkdirSync(outDir, { recursive: true });

const { width, height } = await sharp(source)
  .rotate()
  .resize({ width: MAX_WIDTH, withoutEnlargement: true })
  .webp({ quality: 85 })
  .toFile(path.join(outDir, fileName));

console.log(`Saved ${path.join(outDir, fileName)} (${width}x${height})\n`);
console.log(`![圖片說明](${imageUrl}/${fileName})`);

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-|-$/g, '') || 'image'
  );
}
