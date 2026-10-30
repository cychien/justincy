import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { imageSize } from 'image-size';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const RETINA_SUFFIX = /@2x\.\w+$/;
// A wide figure scaled into a column narrower than this shrinks its text past legibility.
const NARROW_MEDIA = '(max-width: 559px)';

/**
 * Gives every Markdown image served from public/ its intrinsic width and height, so
 * the browser reserves its box before the lazy load lands. A missing file fails the
 * build rather than shipping a broken image.
 *
 * An image with a sibling `<name>-narrow.<ext>` becomes a <picture> that serves that
 * variant to small screens, so a figure can re-lay itself out instead of shrinking.
 */
export function rehypeImageDimensions({ publicDir }: { publicDir: string }) {
  return (tree: HastNode) => {
    walk(tree, (node) => {
      const src = node.properties?.src;
      if (typeof src !== 'string' || !src.startsWith('/')) return node;

      Object.assign(node.properties!, dimensions(publicDir, src), {
        loading: 'lazy',
        decoding: 'async',
      });

      const narrowSrc = src.replace(/(\.\w+)$/, '-narrow$1');
      if (!existsSync(path.join(publicDir, decodeURI(narrowSrc)))) return node;

      return {
        type: 'element',
        tagName: 'picture',
        properties: {},
        children: [
          {
            type: 'element',
            tagName: 'source',
            properties: {
              media: NARROW_MEDIA,
              srcSet: [narrowSrc],
              ...dimensions(publicDir, narrowSrc),
            },
            children: [],
          },
          node,
        ],
      };
    });
  };
}

function dimensions(publicDir: string, src: string) {
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
  return { width: Math.round(width / density), height: Math.round(height / density) };
}

function walk(node: HastNode, replaceImage: (img: HastNode) => HastNode) {
  node.children?.forEach((child, index) => {
    if (child.type === 'element' && child.tagName === 'img') {
      node.children![index] = replaceImage(child);
    } else {
      walk(child, replaceImage);
    }
  });
}
