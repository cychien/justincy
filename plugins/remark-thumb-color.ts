import path from 'node:path';

import sharp from 'sharp';
import { parse, stringify } from 'yaml';

interface MdastNode {
  type: string;
  value?: string;
  children?: MdastNode[];
}

/**
 * Adds `thumbColor`, the dominant color of the post's `thumb`, to its frontmatter. It is
 * baked in at build time because the deployed server has neither public/ nor sharp.
 * Must run before remark-mdx-frontmatter turns the YAML into an export.
 */
export function remarkThumbColor({ publicDir }: { publicDir: string }) {
  return async (tree: MdastNode) => {
    const yamlNode = tree.children?.find((node) => node.type === 'yaml');
    if (!yamlNode?.value) return;

    const frontmatter = parse(yamlNode.value) as Record<string, unknown>;
    const { thumb } = frontmatter;
    if (typeof thumb !== 'string' || !thumb.startsWith('/')) return;

    const file = path.join(publicDir, decodeURI(thumb));
    const { dominant } = await sharp(file)
      .stats()
      .catch(() => {
        throw new Error(`Thumb not found: ${thumb} (expected at ${file})`);
      });

    yamlNode.value = stringify({ ...frontmatter, thumbColor: toHex(dominant) });
  };
}

function toHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}
