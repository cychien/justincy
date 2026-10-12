import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { format, parseISO } from 'date-fns';
import sharp from 'sharp';

import {
  OG_HEIGHT,
  OG_WIDTH,
  PROJECT_ROOT,
  fail,
  parseArgs,
  publicDir,
  readFrontmatter,
  requirePost,
  workDir,
} from './lib.ts';

const USAGE = `Usage: node og.ts <slug> [--title "<override>"] [--cover <image>]

Renders assets/og-template.html with the post's title, date and cover through headless
Chrome and writes public/images/blog/<slug>/og.jpg (1200x630).`;

const { positional, flags } = parseArgs(process.argv.slice(2));
const [slug] = positional;
if (!slug) fail(USAGE);
requirePost(slug);

const frontmatter = readFrontmatter(slug);
const title = flags.title?.[0] ?? frontmatter.title;
const cover = path.resolve(flags.cover?.[0] ?? path.join(publicDir(slug), 'cover.webp'));
if (!existsSync(cover)) fail(`No cover at ${cover}. Run grade.ts first, or pass --cover.`);

const chrome =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(chrome))
  fail(`Chrome not found at ${chrome}. Set CHROME_PATH to a Chrome or Chromium binary.`);

const dir = workDir(slug);
const template = readFileSync(
  path.join(import.meta.dirname, '../assets/og-template.html'),
  'utf-8'
);
const html = template
  .replaceAll(
    '{{fonts}}',
    pathToFileURL(path.join(PROJECT_ROOT, 'node_modules/@fontsource-variable')).href
  )
  .replaceAll('{{cover}}', pathToFileURL(cover).href)
  .replaceAll('{{title}}', escapeHtml(title))
  .replaceAll('{{date}}', format(parseISO(frontmatter.date), 'yyyy.MM.dd'));
const htmlPath = path.join(dir, 'og.html');
writeFileSync(htmlPath, html);

// Rendered at 2x and downsampled: Chrome's own 1x output leaves CJK strokes ragged.
// No --user-data-dir on purpose: a fresh profile makes Chrome hang ~25s before exiting.
const shotPath = path.join(dir, 'og@2x.png');
const result = spawnSync(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${OG_WIDTH},${OG_HEIGHT}`,
    '--force-device-scale-factor=2',
    '--virtual-time-budget=3000',
    `--screenshot=${shotPath}`,
    pathToFileURL(htmlPath).href,
  ],
  { encoding: 'utf-8' }
);
if (result.status !== 0 || !existsSync(shotPath)) {
  fail(`Chrome failed to render the OG page:\n${result.stderr}`);
}

const ogPath = path.join(publicDir(slug), 'og.jpg');
await sharp(shotPath)
  .resize({ width: OG_WIDTH, height: OG_HEIGHT })
  .jpeg({ quality: 90, mozjpeg: true })
  .toFile(ogPath);

console.log(`OG image ${path.relative(process.cwd(), ogPath)} (${OG_WIDTH}x${OG_HEIGHT})`);
console.log(`Source   ${path.relative(process.cwd(), htmlPath)}`);
console.log(`\nFrontmatter:\nogImage: /images/blog/${slug}/og.jpg`);

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"]/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]!
  );
}
