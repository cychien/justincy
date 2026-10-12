import { readFileSync } from 'node:fs';
import path from 'node:path';

import { imageSize } from 'image-size';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const RETINA_SUFFIX = /@2x\.\w+$/;

/**
 * Gives every Markdown image served from public/ its intrinsic width and height, so
 * the browser reserves its box before the lazy load lands. A missing file fails the
 * build rather than shipping a broken image.
 */
export function rehypeImageDimensions({ publicDir }: { publicDir: string }) {
  return (tree: HastNode) => {
    walk(tree, (node) => {
      const src = node.properties?.src;
      if (node.tagName !== 'img' || typeof src !== 'string' || !src.startsWith('/')) return;

      const file = path.join(publicDir, decodeURI(src));
      let buffer: Buffer;
      try {
        buffer = readFileSync(file);
      } catch {
        throw new Error(`Image not found: ${src} (expected at ${file})`);
      }

      const { width, height } = imageSize(buffer);
      // A @2x file holds twice the pixels it should occupy on screen.
      const density = RETINA_SUFFIX.test(src) ? 2 : 1;
      Object.assign(node.properties!, {
        width: Math.round(width / density),
        height: Math.round(height / density),
        loading: 'lazy',
        decoding: 'async',
      });
    });
  };
}

function walk(node: HastNode, visit: (node: HastNode) => void) {
  if (node.type === 'element') visit(node);
  node.children?.forEach((child) => walk(child, visit));
}
