import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import { fail, parseArgs, requirePost, workDir } from './lib.ts';

const USAGE = `Usage: node compare.ts <slug> <image>... [--out <name>]

Lays the given candidates side by side at card size (360px wide, as /blog shows them), each
labelled with its file name, and writes tmp/blog-cover/<slug>/previews/<name>.png
(default compare.png). Use it to judge candidates against each other, and to show the user
the options in one picture.`;

const CARD_WIDTH = 360;
const CARD_HEIGHT = 270;
const LABEL_HEIGHT = 30;
const GAP = 20;
const PER_ROW = 3;

const { positional, flags } = parseArgs(process.argv.slice(2));
const [slug, ...images] = positional;
if (!slug || images.length === 0) fail(USAGE);
requirePost(slug);
for (const image of images) if (!existsSync(image)) fail(`Image not found: ${image}`);

const columns = Math.min(PER_ROW, images.length);
const rows = Math.ceil(images.length / PER_ROW);
const cellHeight = CARD_HEIGHT + LABEL_HEIGHT;

const tiles = await Promise.all(
  images.map(async (image, index) => {
    const card = await sharp(image)
      .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover', position: 'top' })
      .composite([{ input: roundedCorners(), blend: 'dest-in' }])
      .png()
      .toBuffer();
    const label = Buffer.from(
      `<svg width="${CARD_WIDTH}" height="${LABEL_HEIGHT}"><text x="2" y="21" font-family="Helvetica" font-size="15" fill="#52525b">${escape(path.parse(image).name)}</text></svg>`
    );
    const left = GAP + (index % PER_ROW) * (CARD_WIDTH + GAP);
    const top = GAP + Math.floor(index / PER_ROW) * (cellHeight + GAP);
    return [
      { input: card, left, top },
      { input: label, left, top: top + CARD_HEIGHT },
    ];
  })
);

const outDir = path.join(workDir(slug), 'previews');
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `${flags.out?.[0] ?? 'compare'}.png`);
await sharp({
  create: {
    width: GAP + columns * (CARD_WIDTH + GAP),
    height: GAP + rows * (cellHeight + GAP),
    channels: 3,
    background: '#ffffff',
  },
})
  .composite(tiles.flat())
  .png()
  .toFile(out);
console.log(`Compare ${path.relative(process.cwd(), out)} (${images.length} cards)`);

function roundedCorners(): Buffer {
  return Buffer.from(
    `<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}"><rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="12"/></svg>`
  );
}

function escape(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
