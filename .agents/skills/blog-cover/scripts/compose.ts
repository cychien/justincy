import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import sharp, { type OverlayOptions } from 'sharp';

import {
  COVER_HEIGHT,
  COVER_WIDTH,
  fail,
  parseArgs,
  requirePost,
  subjectBounds,
  workDir,
} from './lib.ts';

const BACKGROUNDS = ['solid', 'mesh'] as const;
const PATTERNS = ['none', 'dots', 'grid', 'lines'] as const;
type Background = (typeof BACKGROUNDS)[number];
type Pattern = (typeof PATTERNS)[number];

const DEFAULT_COLORS: Record<Background, string[]> = {
  solid: ['#ececf1'],
  mesh: ['#ebe9f4', '#b8c2ee', '#f2c4b5', '#a8d2e4'],
};

const USAGE = `Usage: node compose.ts <slug> <cutout.png> --name <candidate> [--bg ${BACKGROUNDS.join('|')} [--colors '#rrggbb,...'] | --image <backdrop>] [--pattern ${PATTERNS.join('|')}] [--pattern-color '#rrggbb'] [--shadow 0..1] [--wrap 0..1] [--depth 0..1] [--ambient 0..1] [--vignette 0..1] [--height 0..1] [--x 0..1] [--seed <n>]

Places a cutout from cutout.ts on a designed background and writes the 4:3 candidate
tmp/blog-cover/<slug>/candidates/<candidate>.png, ready for grade.ts.
--bg             solid: the first color. mesh (default): soft blobs of the other colors over it.
--colors         the first is the base; the rest tint the mesh.
--image          a backdrop image instead, such as one made with generate.ts; it is cropped to fill
                 the cover from its centre. Never an image that shows a person or a scene.
--pattern        a fine texture over the background, fading out behind the subject (default none).
--pattern-color  its color; defaults to a quiet shade of the base.
The next five settle the subject into the background instead of pasting it on top; keep them on.
--shadow         a soft, diffuse shadow of the subject on the background (default 0.35).
--wrap           light wrap: the background's color bleeding into the subject's outer edge (default 0.4).
--depth          depth of field: blurs the background as a lens focused on the subject would, so a
                 crisp backdrop does not out-resolve a softer photo (default 0.5).
--ambient        tints the subject with the background's hue, as light bouncing off it would; it
                 changes no brightness (default 0.3).
--vignette       a gentle fall-off of light toward the corners, over the whole picture (default 0.25).
--height         the subject's height as a share of the cover (default 0.9).
--x              where the subject's centre sits across the cover, 0 left to 1 right (default 0.5).
--seed           reshuffles the mesh blobs.
A subject cut off by the photo's bottom edge is anchored to the cover's bottom edge, so the cut
never shows; otherwise it is centred vertically.`;

const { positional, flags } = parseArgs(process.argv.slice(2));
const [slug, input] = positional;
const name = flags.name?.[0];
if (!slug || !input || !name) fail(USAGE);
requirePost(slug);
if (!existsSync(input)) fail(`Cutout not found: ${input}`);

const image = flags.image?.[0];
if (image && (flags.bg || flags.colors))
  fail('--image replaces --bg and --colors; pass one or the other.');
if (image && !existsSync(image)) fail(`Backdrop not found: ${image}`);
const background = (flags.bg?.[0] ?? 'mesh') as Background;
if (!BACKGROUNDS.includes(background)) fail(`Unknown --bg ${background}. ${USAGE}`);
const colors = image
  ? [await averageColor(image)]
  : (flags.colors?.[0]?.split(',') ?? DEFAULT_COLORS[background]);
const pattern = (flags.pattern?.[0] ?? 'none') as Pattern;
if (!PATTERNS.includes(pattern)) fail(`Unknown --pattern ${pattern}. ${USAGE}`);
const patternColor = flags['pattern-color']?.[0] ?? quietShade(colors[0]);
for (const color of [...colors, patternColor]) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) fail(`${color} is not a #rrggbb color.`);
}
if (!image && background === 'mesh' && colors.length < 2) {
  fail('--bg mesh needs two or more colors.');
}
const shadow = unit('shadow', 0.35);
const wrap = unit('wrap', 0.4);
const depth = unit('depth', 0.5);
const ambient = unit('ambient', 0.3);
const vignette = unit('vignette', 0.25);
const heightShare = Number(flags.height?.[0] ?? 0.9);
const centreX = Number(flags.x?.[0] ?? 0.5);
const seed = Number(flags.seed?.[0] ?? 1);
if (!(heightShare > 0 && heightShare <= 1.2)) fail('--height must be between 0 and 1.2.');
if (!(centreX >= 0 && centreX <= 1)) fail('--x must be between 0 and 1.');

const candidatesDir = path.join(workDir(slug), 'candidates');
mkdirSync(candidatesDir, { recursive: true });
const target = path.join(candidatesDir, `${name}.png`);
if (existsSync(target))
  fail(`${target} already exists. Pick another --name so earlier candidates stay comparable.`);

const bounds = await subjectBounds(input);
const cutAtBottom = bounds.top + bounds.height >= bounds.imageHeight - 2;
const cutAtSide = bounds.left <= 1 || bounds.left + bounds.width >= bounds.imageWidth - 1;

const scale = (COVER_HEIGHT * heightShare) / bounds.height;
const width = Math.round(bounds.width * scale);
const height = Math.round(bounds.height * scale);
const resized = await defringe(
  await sharp(input)
    .extract({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height })
    .resize(width, height, { kernel: 'lanczos3' })
    .png()
    .toBuffer()
);
const left = Math.round(COVER_WIDTH * centreX - width / 2);
const top = cutAtBottom ? COVER_HEIGHT - height : Math.round((COVER_HEIGHT - height) / 2);

const placed = await placeOnCanvas(resized, width, height, left, top);
const alpha = await sharp(placed).extractChannel(3).raw().toBuffer();
const head = headPosition(alpha);

const backdrop = await renderBackground(head);
const subject = ambient > 0 ? await tintWithAmbient(placed, backdrop) : placed;
const layers: OverlayOptions[] = [];
if (shadow > 0) layers.push({ input: await renderShadow(alpha) });
layers.push({ input: subject });
if (wrap > 0) layers.push({ input: await renderLightWrap(alpha, backdrop) });
if (vignette > 0) layers.push({ input: renderVignette() });
layers.push({ input: await grain(), blend: 'soft-light' });
await sharp(backdrop).composite(layers).png().toFile(target);

console.log(
  `Saved ${path.relative(process.cwd(), target)} (${COVER_WIDTH}x${COVER_HEIGHT}, ${image ? path.basename(image) : background}${pattern === 'none' ? '' : ` + ${pattern}`})`
);
if (scale > 1.6) {
  console.log(
    `Warning: the subject is enlarged ${scale.toFixed(1)}x and will look soft. Use a larger source or a lower --height.`
  );
}
if (cutAtSide) {
  console.log(
    'Warning: the photo cuts the subject at a side edge, which shows as a straight line. Check it, or move --x so that edge leaves the cover.'
  );
}

function unit(flag: string, fallback: number): number {
  const value = Number(flags[flag]?.[0] ?? fallback);
  if (!(value >= 0 && value <= 1)) fail(`--${flag} must be between 0 and 1.`);
  return value;
}

// A cutout's outer few pixels still carry the old background: a faint ring of alpha, and opaque
// edge pixels whose color was blended with it (a light rim around dark hair). Tighten the alpha,
// then repaint that band with the color of the subject just inside it.
async function defringe(image: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const count = w * h;
  const alpha = Buffer.alloc(count);
  for (let i = 0; i < count; i++) {
    alpha[i] = Math.min(255, Math.max(0, (data[i * 4 + 3] - 0.4 * 255) / 0.6));
  }

  const band = Math.max(2, Math.round(w / 300));
  const grey = { width: w, height: h, channels: 1 as const };
  const spread = await sharp(alpha, { raw: grey }).blur(band).toColourspace('b-w').raw().toBuffer();
  const core = Buffer.alloc(count);
  const weighted = Buffer.alloc(count * 3);
  for (let i = 0; i < count; i++) {
    core[i] = Math.min(255, Math.max(0, (spread[i] - 0.85 * 255) / 0.15));
    for (let c = 0; c < 3; c++) weighted[i * 3 + c] = (data[i * 4 + c] * core[i]) / 255;
  }
  const reach = band * 2;
  const [weightedBlur, coreBlur] = await Promise.all([
    sharp(weighted, { raw: { width: w, height: h, channels: 3 } })
      .blur(reach)
      .raw()
      .toBuffer(),
    sharp(core, { raw: grey }).blur(reach).toColourspace('b-w').raw().toBuffer(),
  ]);

  const out = Buffer.alloc(count * 4);
  for (let i = 0; i < count; i++) {
    const keep = core[i] / 255;
    for (let c = 0; c < 3; c++) {
      const inside =
        coreBlur[i] > 0 ? (weightedBlur[i * 3 + c] * 255) / coreBlur[i] : data[i * 4 + c];
      out[i * 4 + c] = Math.round(data[i * 4 + c] * keep + Math.min(255, inside) * (1 - keep));
    }
    out[i * 4 + 3] = alpha[i];
  }
  // A cut that is sharper than the photo around it is the surest sign of a paste-up.
  const feathered = await sharp(alpha, { raw: grey })
    .blur(Math.max(0.6, w / 1600))
    .toColourspace('b-w')
    .raw()
    .toBuffer();
  for (let i = 0; i < count; i++) out[i * 4 + 3] = Math.min(alpha[i], feathered[i] * 1.15);
  return sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
}

async function placeOnCanvas(
  image: Buffer,
  w: number,
  h: number,
  x: number,
  y: number
): Promise<Buffer> {
  const visibleLeft = Math.max(0, -x);
  const visibleTop = Math.max(0, -y);
  const visibleWidth = Math.min(w, COVER_WIDTH - x) - visibleLeft;
  const visibleHeight = Math.min(h, COVER_HEIGHT - y) - visibleTop;
  if (visibleWidth <= 0 || visibleHeight <= 0) fail('The subject falls outside the cover.');
  const visible = await sharp(image)
    .extract({ left: visibleLeft, top: visibleTop, width: visibleWidth, height: visibleHeight })
    .toBuffer();
  return sharp({
    create: { width: COVER_WIDTH, height: COVER_HEIGHT, channels: 4, background: '#00000000' },
  })
    .composite([{ input: visible, left: x + visibleLeft, top: y + visibleTop }])
    .png()
    .toBuffer();
}

// The centre of the top third of the silhouette stands in for the head, where light and the
// pattern's clear zone should sit.
function headPosition(mask: Buffer): { x: number; y: number } {
  let firstRow = -1;
  let lastRow = -1;
  for (let y = 0; y < COVER_HEIGHT; y++) {
    for (let x = 0; x < COVER_WIDTH; x++) {
      if (mask[y * COVER_WIDTH + x] > 128) {
        if (firstRow < 0) firstRow = y;
        lastRow = y;
        break;
      }
    }
  }
  const band = firstRow + (lastRow - firstRow) / 3;
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (let y = firstRow; y <= band; y++) {
    for (let x = 0; x < COVER_WIDTH; x++) {
      if (mask[y * COVER_WIDTH + x] > 128) {
        sumX += x;
        sumY += y;
        count++;
      }
    }
  }
  return { x: sumX / count, y: sumY / count };
}

async function renderBackground(focus: { x: number; y: number }): Promise<Buffer> {
  const [baseColor, ...accents] = colors;
  const random = mulberry32(seed);
  let defs = '';
  let layers = '';
  if (image) {
    const backdrop = await sharp(image)
      .rotate()
      .resize(COVER_WIDTH, COVER_HEIGHT, { fit: 'cover' })
      .png()
      .toBuffer();
    layers += `<image href="data:image/png;base64,${backdrop.toString('base64')}" width="${COVER_WIDTH}" height="${COVER_HEIGHT}"/>`;
  } else if (background === 'mesh') {
    accents.forEach((color, index) => {
      defs += `<radialGradient id="blob${index}"><stop offset="0" stop-color="${color}" stop-opacity="0.95"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
      const cx = COVER_WIDTH * (0.1 + 0.8 * random());
      const cy = COVER_HEIGHT * (0.1 + 0.8 * random());
      const r = COVER_WIDTH * (0.35 + 0.25 * random());
      layers += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#blob${index})"/>`;
    });
  }
  if (pattern !== 'none') {
    defs += patternTile(pattern, patternColor);
    // The texture belongs to the backdrop: clear behind the head, strongest toward the corners.
    defs += `<radialGradient id="fade" gradientUnits="userSpaceOnUse" cx="${focus.x}" cy="${focus.y}" r="${COVER_WIDTH * 0.75}"><stop offset="0.2" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient><mask id="fadeMask"><rect width="100%" height="100%" fill="url(#fade)"/></mask>`;
    layers += `<rect width="100%" height="100%" fill="url(#tile)" mask="url(#fadeMask)"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${COVER_WIDTH}" height="${COVER_HEIGHT}"><defs>${defs}</defs><rect width="100%" height="100%" fill="${baseColor}"/>${layers}</svg>`;
  const flat = sharp(Buffer.from(svg));
  const sigma = (depth * COVER_WIDTH) / 240;
  return (sigma >= 0.3 ? flat.blur(sigma) : flat).png().toBuffer();
}

function patternTile(kind: Exclude<Pattern, 'none'>, color: string): string {
  if (kind === 'dots') {
    return `<pattern id="tile" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="2.4" fill="${color}"/></pattern>`;
  }
  if (kind === 'grid') {
    return `<pattern id="tile" width="54" height="54" patternUnits="userSpaceOnUse"><path d="M54 0H0V54" fill="none" stroke="${color}" stroke-width="1.6"/></pattern>`;
  }
  return `<pattern id="tile" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V22" stroke="${color}" stroke-width="2"/></pattern>`;
}

// A blurred, offset silhouette in a deep shade of the base, so the shadow reads as the
// backdrop's own color in shade rather than grey.
async function renderShadow(mask: Buffer): Promise<Buffer> {
  const [r, g, b] = mix(hex(colors[0]), [0, 0, 0], 0.65);
  const pixels = Buffer.alloc(COVER_WIDTH * COVER_HEIGHT * 4);
  for (let i = 0; i < mask.length; i++) {
    pixels[i * 4] = r;
    pixels[i * 4 + 1] = g;
    pixels[i * 4 + 2] = b;
    pixels[i * 4 + 3] = mask[i] * shadow;
  }
  const dx = Math.round(COVER_WIDTH * 0.025);
  const dy = Math.round(COVER_HEIGHT * 0.015);
  const blurred = await sharp(pixels, {
    raw: { width: COVER_WIDTH, height: COVER_HEIGHT, channels: 4 },
  })
    .blur(COVER_WIDTH / 36)
    .png()
    .toBuffer();
  const shifted = await sharp(blurred)
    .extract({ left: 0, top: 0, width: COVER_WIDTH - dx, height: COVER_HEIGHT - dy })
    .toBuffer();
  return sharp({
    create: { width: COVER_WIDTH, height: COVER_HEIGHT, channels: 4, background: '#00000000' },
  })
    .composite([{ input: shifted, left: dx, top: dy }])
    .png()
    .toBuffer();
}

// The blurred backdrop, kept only in a thin band just inside the silhouette's edge.
async function renderLightWrap(mask: Buffer, backdrop: Buffer): Promise<Buffer> {
  const raw = { width: COVER_WIDTH, height: COVER_HEIGHT, channels: 1 as const };
  // sharp writes a blurred single channel back out as RGB unless told to stay greyscale.
  const inner = await sharp(mask, { raw })
    .blur(COVER_WIDTH / 480)
    .toColourspace('b-w')
    .raw()
    .toBuffer();
  if (inner.length !== mask.length) fail('Light wrap: unexpected mask layout.');
  const surround = await sharp(backdrop)
    .removeAlpha()
    .blur(COVER_WIDTH / 40)
    .raw()
    .toBuffer();
  const pixels = Buffer.alloc(COVER_WIDTH * COVER_HEIGHT * 4);
  for (let i = 0; i < mask.length; i++) {
    const edge = (mask[i] / 255) * Math.min(1, Math.max(0, (1 - inner[i] / 255) * 3));
    pixels[i * 4] = surround[i * 3];
    pixels[i * 4 + 1] = surround[i * 3 + 1];
    pixels[i * 4 + 2] = surround[i * 3 + 2];
    pixels[i * 4 + 3] = 255 * edge * wrap * 0.5;
  }
  return sharp(pixels, { raw: { width: COVER_WIDTH, height: COVER_HEIGHT, channels: 4 } })
    .png()
    .toBuffer();
}

// Light bouncing off a colored backdrop tints whatever stands in front of it. Shift the subject's
// color balance toward the backdrop's hue, normalised so its brightness stays the same.
async function tintWithAmbient(layer: Buffer, surroundings: Buffer): Promise<Buffer> {
  const { channels } = await sharp(surroundings).stats();
  const mean = channels.slice(0, 3).map(({ mean: value }) => value);
  const luminance = 0.2126 * mean[0] + 0.7152 * mean[1] + 0.0722 * mean[2];
  const gains = mean.map((value) => 1 + ambient * 0.5 * (value / luminance - 1));
  const { data, info } = await sharp(layer).raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < info.width * info.height; i++) {
    for (let c = 0; c < 3; c++) {
      data[i * 4 + c] = Math.min(255, Math.round(data[i * 4 + c] * gains[c]));
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

function renderVignette(): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${COVER_WIDTH}" height="${COVER_HEIGHT}"><defs><radialGradient id="v" cx="50%" cy="45%" r="75%"><stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${(0.45 * vignette).toFixed(3)}"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#v)"/></svg>`;
  return Buffer.from(svg);
}

async function averageColor(file: string): Promise<string> {
  const { channels } = await sharp(file).stats();
  return `#${channels
    .slice(0, 3)
    .map(({ mean }) => Math.round(mean).toString(16).padStart(2, '0'))
    .join('')}`;
}

function hex(color: string): [number, number, number] {
  const value = parseInt(color.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mix(
  a: [number, number, number],
  b: [number, number, number],
  amount: number
): [number, number, number] {
  return a.map((channel, index) => Math.round(channel + (b[index] - channel) * amount)) as [
    number,
    number,
    number,
  ];
}

function quietShade(color: string): string {
  const rgb = hex(color);
  const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  const shade = mix(rgb, luminance > 0.5 ? [0, 0, 0] : [255, 255, 255], 0.14);
  return `#${shade.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

// Fine grain keeps the smooth gradients from banding once the cover is encoded as WebP.
function grain(): Promise<Buffer> {
  return sharp({
    create: {
      width: COVER_WIDTH,
      height: COVER_HEIGHT,
      channels: 3,
      background: '#808080',
      noise: { type: 'gaussian', mean: 128, sigma: 10 },
    },
  })
    .png()
    .toBuffer();
}

function mulberry32(value: number): () => number {
  let state = value >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
