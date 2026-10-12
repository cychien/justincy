import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import { fail, parseArgs, requirePost, workDir } from './lib.ts';

const USAGE = `Usage: node frames.ts <slug> <youtube-id | youtube-url | video-file> [--count 32] [--from <sec>] [--to <sec>]

Pulls evenly spaced frames from a video into tmp/blog-cover/<slug>/material/frames/<video>-<from>-<to>s/
and writes a numbered contact sheet, sheet.png, beside them. Each video and range gets its own folder.
YouTube is read by seeking the remote stream, so nothing is downloaded in full.`;

const { positional, flags } = parseArgs(process.argv.slice(2));
const [slug, source] = positional;
if (!slug || !source) fail(USAGE);
requirePost(slug);

for (const tool of ['ffmpeg', ...(isLocalFile(source) ? [] : ['yt-dlp'])]) {
  try {
    execFileSync('which', [tool], { stdio: 'ignore' });
  } catch {
    fail(`${tool} is not installed (brew install ${tool}).`);
  }
}

const count = Number(flags.count?.[0] ?? 32);
const { url, duration } = isLocalFile(source) ? probeLocal(source) : resolveYouTube(source);

// Talks often show the speaker full-frame only in the opening minutes, so start at zero.
const from = Number(flags.from?.[0] ?? 0);
const to = Number(flags.to?.[0] ?? duration * 0.98);
const times = Array.from({ length: count }, (_, i) => from + ((to - from) * (i + 0.5)) / count);

const framesDir = path.join(
  workDir(slug),
  'material/frames',
  `${sourceName(source)}-${Math.round(from)}-${Math.round(to)}s`
);
mkdirSync(framesDir, { recursive: true });

console.log(`Extracting ${count} frames from ${Math.round(from)}s to ${Math.round(to)}s...`);
const frames = await mapLimit(times, 6, async (time, index) => {
  const file = path.join(
    framesDir,
    `${String(index + 1).padStart(2, '0')}-${Math.round(time)}s.jpg`
  );
  await run('ffmpeg', [
    '-loglevel',
    'error',
    '-y',
    '-ss',
    String(time),
    '-i',
    url,
    '-frames:v',
    '1',
    '-q:v',
    '2',
    file,
  ]);
  return existsSync(file) ? { file, label: `${index + 1} · ${formatTime(time)}` } : null;
});
const extracted = frames.filter((frame) => frame !== null);
if (extracted.length === 0) fail('No frames could be extracted.');

const sheetPath = path.join(framesDir, 'sheet.png');
await contactSheet(extracted, sheetPath);
console.log(`Frames ${path.relative(process.cwd(), framesDir)}/ (${extracted.length})`);
console.log(`Sheet  ${path.relative(process.cwd(), sheetPath)}`);
console.log(
  `\nOpen a frame at full size before picking it; the sheet is too small to judge expression or sharpness.`
);

function isLocalFile(value: string): boolean {
  return existsSync(value);
}

function youTubeId(value: string): string {
  return value.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1] ?? value;
}

function sourceName(value: string): string {
  return isLocalFile(value) ? path.parse(value).name : youTubeId(value);
}

function resolveYouTube(value: string): { url: string; duration: number } {
  const id = youTubeId(value);
  const output = execFileSync(
    'yt-dlp',
    [
      '-q',
      '--no-warnings',
      '-f',
      'bv*[height<=1080]',
      '--print',
      'duration',
      '--print',
      'url',
      `https://www.youtube.com/watch?v=${id}`,
    ],
    { encoding: 'utf-8' }
  ).trim();
  const [duration, url] = output.split('\n');
  return { url, duration: Number(duration) };
}

function probeLocal(file: string): { url: string; duration: number } {
  const duration = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file],
    { encoding: 'utf-8' }
  );
  return { url: path.resolve(file), duration: Number(duration) };
}

async function contactSheet(items: { file: string; label: string }[], out: string): Promise<void> {
  const columns = 4;
  const tileWidth = 480;
  const tileHeight = 270;
  const labelHeight = 28;
  const gap = 12;
  const rows = Math.ceil(items.length / columns);
  const tiles = await Promise.all(
    items.map(async ({ file, label }, index) => {
      const image = await sharp(file).resize(tileWidth, tileHeight, { fit: 'cover' }).toBuffer();
      const caption = Buffer.from(
        `<svg width="${tileWidth}" height="${labelHeight}"><text x="0" y="20" font-family="Helvetica" font-size="18" fill="#3f3f46">${label}</text></svg>`
      );
      const left = (index % columns) * (tileWidth + gap);
      const top = Math.floor(index / columns) * (tileHeight + labelHeight + gap);
      return [
        { input: image, left, top },
        { input: caption, left, top: top + tileHeight },
      ];
    })
  );
  await sharp({
    create: {
      width: columns * tileWidth + (columns - 1) * gap,
      height: rows * (tileHeight + labelHeight + gap) - gap,
      channels: 3,
      background: '#ffffff',
    },
  })
    .composite(tiles.flat())
    .png()
    .toFile(out);
}

function formatTime(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// A remote seek occasionally stalls forever; give up on that frame rather than the whole run.
function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'ignore', timeout: 90_000 });
    child.on('close', () => resolve());
    child.on('error', () => resolve());
  });
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await task(items[index], index);
      }
    })
  );
  return results;
}
