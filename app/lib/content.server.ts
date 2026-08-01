import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeStringify from 'rehype-stringify';

const CONTENT_ROOT = path.join(process.cwd(), 'app/content');

export interface ContentEntry<T> {
  slug: string;
  frontmatter: T;
}

export interface ContentDocument<T> extends ContentEntry<T> {
  html: string;
}

/**
 * A collection is a directory under app/content. Frontmatter is returned as authored —
 * callers own the shape and the sort order.
 */
export function listCollection<T>(collection: string): ContentEntry<T>[] {
  const directory = path.join(CONTENT_ROOT, collection);
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => ({
      slug: file.replace(/\.mdx$/, ''),
      frontmatter: matter(fs.readFileSync(path.join(directory, file), 'utf-8')).data as T,
    }));
}

export async function readDocument<T>(
  collection: string,
  slug: string
): Promise<ContentDocument<T> | null> {
  const filePath = path.join(CONTENT_ROOT, collection, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'));
  const file = await createProcessor().process(content);

  return { slug, frontmatter: data as T, html: String(file) };
}

function createProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypePrettyCode, {
      theme: { dark: 'github-dark', light: 'catppuccin-latte' },
      keepBackground: false,
    })
    .use(rehypeStringify);
}
