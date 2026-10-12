import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import {
  COVER_HEIGHT,
  COVER_WIDTH,
  PROJECT_ROOT,
  fail,
  parseArgs,
  publicDir,
  readFrontmatter,
  requirePost,
  workDir,
} from './lib.ts';

const USAGE = `Usage: node grade.ts <slug> <image> [--box <left,top,width,height>] [--focus attention|top|center|bottom|left|right] [--strength 0..1] [--preview [--label <name>]]

Crops the image to 4:3, applies a gentle calming grade, and writes
public/images/blog/<slug>/cover.webp. For review it also writes, under tmp/blog-cover/<slug>/previews/:
  <image>-card.png    the cover at card size
  <image>-index.png   the cover beside the other posts' covers, as /blog shows them
--box cuts that region (in source pixels) first, to frame the subject tighter than a full-height crop.
--strength defaults to 0.5. Use 0 when the image already sits well beside the others.
--preview writes only the review images, so several picks or crops can be compared side by side;
--label names a variant, for comparing crops of one image.`;

const { positional, flags } = parseArgs(process.argv.slice(2));
const [slug, input] = positional;
if (!slug || !input) fail(USAGE);
requirePost(slug);

const focus = flags.focus?.[0] ?? 'attention';
const strength = Number(flags.strength?.[0] ?? 0.5);
if (!(strength >= 0 && strength <= 1)) fail('--strength must be between 0 and 1');
const previewOnly = flags.preview !== undefined;
const box = parseBox(flags.box?.[0]);

const POSITIONS: Record<string, string | number> = {
  attention: sharp.strategy.attention,
  top: 'top',
  center: 'centre',
  bottom: 'bottom',
  left: 'left',
  right: 'right',
};
const position = POSITIONS[focus];
if (position === undefined) fail(`Unknown --focus ${focus}. ${USAGE}`);

const source = sharp(input).rotate();
if (box) source.extract(box);
const cropped = source.resize({ width: COVER_WIDTH, height: COVER_HEIGHT, fit: 'cover', position });

// Takes the edge off loud images so covers sit together on /blog: less saturation,
// lifted blacks, softened highlights, and a faint neutral wash that nudges mixed
// sources toward one another without imposing a palette.
const graded = cropped
  .modulate({ saturation: 1 - 0.3 * strength })
  .linear(1 - 0.14 * strength, 255 * 0.08 * strength)
  .composite([
    {
      input: {
        create: {
          width: COVER_WIDTH,
          height: COVER_HEIGHT,
          channels: 4,
          background: { r: 212, g: 212, b: 216, alpha: 0.07 * strength },
        },
      },
      blend: 'over',
    },
  ])
  .sharpen({ sigma: 0.6 });

const buffer = await graded.png().toBuffer();

const previewDir = path.join(workDir(slug), 'previews');
mkdirSync(previewDir, { recursive: true });
const label = flags.label?.[0];
const name = label ? `${path.parse(input).name}-${label}` : path.parse(input).name;
const previewPath = path.join(previewDir, `${name}-card.png`);
const indexPreviewPath = path.join(previewDir, `${name}-index.png`);
await sharp(buffer).resize({ width: 720 }).png().toFile(previewPath);
await renderIndexPreview(buffer, indexPreviewPath);

if (!previewOnly) {
  const coverPath = path.join(publicDir(slug), 'cover.webp');
  await sharp(buffer).webp({ quality: 82 }).toFile(coverPath);
  console.log(
    `Cover  ${path.relative(process.cwd(), coverPath)} (${COVER_WIDTH}x${COVER_HEIGHT}, focus ${focus}, strength ${strength})`
  );
}
console.log(`Review ${path.relative(process.cwd(), previewPath)}`);
console.log(`       ${path.relative(process.cwd(), indexPreviewPath)}`);
if (!previewOnly) {
  console.log(
    `\nFrontmatter:\nthumb: /images/blog/${slug}/cover.webp\nthumbAlt: <describe what is in the picture>`
  );
}

function parseBox(
  value: string | undefined
): { left: number; top: number; width: number; height: number } | null {
  if (!value) return null;
  const parts = value.split(',').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    fail(`--box takes four non-negative integers: left,top,width,height. ${USAGE}`);
  }
  const [left, top, width, height] = parts;
  return { left, top, width, height };
}

// Newest first like /blog, this post outlined so it is easy to find among the others.
async function renderIndexPreview(cover: Buffer, out: string): Promise<void> {
  const cardWidth = 360;
  const cardHeight = 270;
  const gap = 24;
  const blogDir = path.join(PROJECT_ROOT, 'app/content/blog');
  const others = readdirSync(blogDir)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''))
    .filter((other) => other !== slug)
    .flatMap((other) => {
      const { date, thumb } = readFrontmatter(other);
      const file = thumbFile(thumb);
      return file ? [{ date, image: file as string | Buffer, current: false }] : [];
    });

  const current = {
    date: readFrontmatter(slug).date,
    image: cover as string | Buffer,
    current: true,
  };
  const cards = [current, ...others].sort((a, b) => b.date.localeCompare(a.date));
  const shown = cards.slice(0, 6);
  if (!shown.includes(current)) shown[shown.length - 1] = current;

  const tiles = await Promise.all(
    shown.map(async (card, index) => {
      const image = await sharp(card.image)
        .resize(cardWidth, cardHeight, { fit: 'cover', position: 'top' })
        .composite([{ input: roundedFrame(cardWidth, cardHeight, card.current), blend: 'over' }])
        .png()
        .toBuffer();
      return { input: image, left: gap + index * (cardWidth + gap), top: gap };
    })
  );
  await sharp({
    create: {
      width: gap + shown.length * (cardWidth + gap),
      height: cardHeight + gap * 2,
      channels: 3,
      background: '#ffffff',
    },
  })
    .composite(tiles)
    .png()
    .toFile(out);
}

function thumbFile(thumb: string | undefined): string | null {
  if (!thumb) return null;
  const file = path.join(PROJECT_ROOT, 'public', thumb);
  return existsSync(file) ? file : null;
}

function roundedFrame(width: number, height: number, highlight: boolean): Buffer {
  const stroke = highlight ? '#18181b' : '#e4e4e7';
  const strokeWidth = highlight ? 3 : 1;
  return Buffer.from(
    `<svg width="${width}" height="${height}"><path fill="#fff" fill-rule="evenodd" d="M0 0H${width}V${height}H0Z M12 0.5H${width - 12}A11.5 11.5 0 0 1 ${width - 0.5} 12V${height - 12}A11.5 11.5 0 0 1 ${width - 12} ${height - 0.5}H12A11.5 11.5 0 0 1 0.5 ${height - 12}V12A11.5 11.5 0 0 1 12 0.5Z"/><rect x="${strokeWidth / 2}" y="${strokeWidth / 2}" width="${width - strokeWidth}" height="${height - strokeWidth}" rx="12" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/></svg>`
  );
}
