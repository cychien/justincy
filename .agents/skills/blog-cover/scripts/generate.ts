import { spawn } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';

import { fail, parseArgs, requirePost, workDir } from './lib.ts';

const USAGE = `Usage: node generate.ts <slug> --name <candidate-name> (--prompt "<text>" | --prompt-file <path>) [--ref <image>]... [--size 1536x1024]

Runs Codex's built-in image_gen once and saves the result to tmp/blog-cover/<slug>/candidates/<name>.png.
Each --ref image is attached to the prompt; describe its role (edit target, style reference) in the prompt itself.`;

const { positional, flags } = parseArgs(process.argv.slice(2));
const [slug] = positional;
const name = flags.name?.[0];
if (!slug || !name) fail(USAGE);
requirePost(slug);

const prompt = flags['prompt-file']
  ? readFileSync(flags['prompt-file'][0], 'utf-8')
  : flags.prompt?.[0];
if (!prompt?.trim()) fail(USAGE);

const size = flags.size?.[0] ?? '1536x1024';
const refs = (flags.ref ?? []).map((ref) => path.resolve(ref));
for (const ref of refs) if (!existsSync(ref)) fail(`Reference image not found: ${ref}`);

const dir = workDir(slug);
const candidatesDir = path.join(dir, 'candidates');
const logsDir = path.join(dir, 'logs');
mkdirSync(candidatesDir, { recursive: true });
mkdirSync(logsDir, { recursive: true });

const target = path.join(candidatesDir, `${name}.png`);
if (existsSync(target))
  fail(`${target} already exists. Pick another --name so earlier candidates stay comparable.`);

const generatedImagesDir = path.join(
  process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex'),
  'generated_images'
);
const startedAt = Date.now();

const fullPrompt = `Use your built-in image_gen tool to generate exactly one image at ${size}.
${refs.length ? `The attached image(s) are inputs for this generation; their roles are described in the brief below.\n` : ''}
Brief:
${prompt.trim()}

After the image is generated, copy the generated PNG file to exactly this path and do nothing else:
${target}

Reply with only that path.`;

const logPath = path.join(logsDir, `${name}.log`);
writeFileSync(logPath, `${fullPrompt}\n\n=== codex ===\n`);

const args = [
  'exec',
  '--skip-git-repo-check',
  '-s',
  'workspace-write',
  '-C',
  dir,
  '-o',
  path.join(logsDir, `${name}.last.txt`),
  ...refs.flatMap((ref) => ['-i', ref]),
  // `-i` is variadic, so without `--` the prompt is parsed as one more image path.
  '--',
  fullPrompt,
];

console.log(
  `Generating ${name} for ${slug} (${size}${refs.length ? `, ${refs.length} ref` : ''})...`
);
const exitCode = await new Promise<number>((resolve) => {
  const child = spawn('codex', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const append = (chunk: Buffer) => writeFileSync(logPath, chunk, { flag: 'a' });
  child.stdout.on('data', append);
  child.stderr.on('data', append);
  child.on('error', (error) =>
    fail(`Could not start codex: ${error.message}. Is the Codex CLI installed and on PATH?`)
  );
  child.on('close', (code) => resolve(code ?? 1));
});

if (!existsSync(target)) recoverFromCodexHome();
if (!existsSync(target)) {
  fail(
    `Codex exited with code ${exitCode} and no image reached ${target}.\nSee ${logPath} - a refusal or a safety-policy block shows up there.`
  );
}

const { width, height } = await sharp(target).metadata();
console.log(`Saved ${path.relative(process.cwd(), target)} (${width}x${height})`);

// Codex writes every generation under $CODEX_HOME/generated_images first, so a copy
// that failed in the sandbox can still be picked up from there.
function recoverFromCodexHome(): void {
  if (!existsSync(generatedImagesDir)) return;
  const newest = readdirSync(generatedImagesDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .map((file) => ({ file, mtime: statSync(file).mtimeMs }))
    .filter(({ mtime }) => mtime >= startedAt)
    .sort((a, b) => b.mtime - a.mtime)[0];
  if (newest) copyFileSync(newest.file, target);
}
