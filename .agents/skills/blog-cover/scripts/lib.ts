import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

export const PROJECT_ROOT = path.resolve(import.meta.dirname, '../../../..');

export const COVER_WIDTH = 1440;
export const COVER_HEIGHT = 1080;
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export function workDir(slug: string): string {
  return ensureDir(path.join(PROJECT_ROOT, 'tmp/blog-cover', slug));
}

export function publicDir(slug: string): string {
  return ensureDir(path.join(PROJECT_ROOT, 'public/images/blog', slug));
}

export function postPath(slug: string): string {
  return path.join(PROJECT_ROOT, 'app/content/blog', `${slug}.mdx`);
}

export function requirePost(slug: string): void {
  if (!existsSync(postPath(slug))) {
    fail(`No post at app/content/blog/${slug}.mdx. The slug is the filename without .mdx.`);
  }
}

export interface Frontmatter {
  title: string;
  date: string;
  description?: string;
  thumb?: string;
}

// The posts' frontmatter is flat `key: value` YAML; a full parser is not worth a dependency.
export function readFrontmatter(slug: string): Frontmatter {
  const source = readFileSync(postPath(slug), 'utf-8');
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  if (!match) fail(`${slug}.mdx has no frontmatter block.`);
  const fields: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const field = line.match(/^(\w+):\s*(.*)$/);
    if (field) fields[field[1]] = field[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  if (!fields.title || !fields.date) fail(`${slug}.mdx frontmatter needs title and date.`);
  return {
    title: fields.title,
    date: fields.date,
    description: fields.description,
    thumb: fields.thumb,
  };
}

export interface SubjectBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
}

// The box around the visible pixels of a cutout; faint alpha from edge feathering is ignored.
export async function subjectBounds(file: string): Promise<SubjectBounds> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .extractChannel(3)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] < 32) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) fail(`${file} has no visible subject.`);
  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    imageWidth: info.width,
    imageHeight: info.height,
  };
}

export function parseArgs(argv: string[]): {
  positional: string[];
  flags: Record<string, string[]>;
} {
  const positional: string[] = [];
  const flags: Record<string, string[]> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      (flags[name] ??= []).push('true');
    } else {
      (flags[name] ??= []).push(next);
      i++;
    }
  }
  return { positional, flags };
}

export function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function ensureDir(dir: string): string {
  mkdirSync(dir, { recursive: true });
  return dir;
}
