import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import { PROJECT_ROOT, fail, parseArgs, requirePost, subjectBounds, workDir } from './lib.ts';

const MODES = ['auto', 'person', 'subject'] as const;

const USAGE = `Usage: node cutout.ts <slug> <image> [--crop <left,top,width,height>] [--mode ${MODES.join('|')}] [--instance <n>[,<n>...]] [--name <name>]

Lifts the subject out of a real photo with macOS Vision and writes
tmp/blog-cover/<slug>/cutouts/<name>.png with a transparent background, plus <name>-check.png,
the cutout on a light and on a dark ground, to inspect its edges.
The subject's pixels are the photo's own; nothing is generated.
--crop     trims the cutout to this box, in source pixels: one tile of a split screen, or away
           from a burned-in label, a desk edge or a second person. The model still sees the whole
           photo, since cropping first changes what it decides is the subject.
--mode     auto (default) suits people: the fine person matte for hair, plus anything in front
           of them, such as a microphone. person is the matte alone. subject is the "Copy Subject"
           model from Photos, for objects; it finds every foreground instance and keeps all of
           them unless --instance picks some (their numbers are printed).
--name     the output name; defaults to the image's name.`;

const { positional, flags } = parseArgs(process.argv.slice(2));
const [slug, input] = positional;
if (!slug || !input) fail(USAGE);
requirePost(slug);
if (!existsSync(input)) fail(`Image not found: ${input}`);
if (process.platform !== 'darwin') fail('cutout.ts needs macOS: it uses the Vision framework.');

const mode = (flags.mode?.[0] ?? 'auto') as (typeof MODES)[number];
if (!MODES.includes(mode)) fail(`Unknown --mode ${mode}. ${USAGE}`);
const instances = mode === 'person' ? undefined : flags.instance?.[0];
const crop = parseBox(flags.crop?.[0], '--crop');
const binary = compileOnce();

const outDir = path.join(workDir(slug), 'cutouts');
mkdirSync(outDir, { recursive: true });
const name = flags.name?.[0] ?? path.parse(input).name;
const out = path.join(outDir, `${name}.png`);
const checkPath = path.join(outDir, `${name}-check.png`);

let report: string;
try {
  report = execFileSync(
    binary,
    [mode, path.resolve(input), out, ...(instances ? [instances] : [])],
    {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
} catch (error) {
  fail(String((error as { stderr?: string }).stderr || error).trim());
}

if (crop) await keepOnly(out, crop);

await renderCheck(out, checkPath);
const bounds = await subjectBounds(out);
console.log(`Cutout ${path.relative(process.cwd(), out)}`);
console.log(`Check  ${path.relative(process.cwd(), checkPath)}`);
const found = report.trim().replace('instances', ', instances found:');
console.log(`Subject ${bounds.width}x${bounds.height}px${found}`);
console.log(
  '\nRead the check image before composing: hair, glasses, hands and anything held should be whole, with no halo and no scraps of the old background.'
);

function parseBox(
  value: string | undefined,
  flag: string
): { left: number; top: number; width: number; height: number } | null {
  if (!value) return null;
  const parts = value.split(',').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    fail(`${flag} takes four non-negative integers: left,top,width,height. ${USAGE}`);
  }
  const [left, top, width, height] = parts;
  return { left, top, width, height };
}

async function keepOnly(
  file: string,
  box: { left: number; top: number; width: number; height: number }
): Promise<void> {
  const trimmed = await sharp(file).extract(box).png().toBuffer();
  await sharp(trimmed).toFile(file);
}

// A light and a dark ground side by side expose both dark fringes and light halos.
async function renderCheck(cutout: string, target: string): Promise<void> {
  const { width = 0, height = 0 } = await sharp(cutout).metadata();
  const scale = Math.min(1, 800 / width);
  const tileWidth = Math.round(width * scale);
  const tileHeight = Math.round(height * scale);
  const resized = await sharp(cutout).resize(tileWidth, tileHeight).toBuffer();
  const tiles = await Promise.all(
    ['#f4f4f5', '#27272a'].map((ground) =>
      sharp(resized).flatten({ background: ground }).toBuffer()
    )
  );
  await sharp({
    create: { width: tileWidth * 2, height: tileHeight, channels: 3, background: '#ffffff' },
  })
    .composite(tiles.map((tile, index) => ({ input: tile, left: index * tileWidth, top: 0 })))
    .png()
    .toFile(target);
}

// The Swift script takes a few seconds to compile, so build it once and reuse it until it changes.
function compileOnce(): string {
  const swiftSource = path.join(import.meta.dirname, 'cutout.swift');
  const binDir = path.join(PROJECT_ROOT, 'tmp/blog-cover/.bin');
  const compiled = path.join(binDir, 'cutout');
  if (existsSync(compiled) && statSync(compiled).mtimeMs >= statSync(swiftSource).mtimeMs) {
    return compiled;
  }
  mkdirSync(binDir, { recursive: true });
  try {
    execFileSync('swiftc', ['-O', swiftSource, '-o', compiled], { stdio: 'pipe' });
  } catch (error) {
    fail(`Could not compile cutout.swift (needs Xcode command line tools):\n${error}`);
  }
  return compiled;
}
