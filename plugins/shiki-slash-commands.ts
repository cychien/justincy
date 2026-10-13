import type { ShikiTransformer, ThemedToken } from 'shiki';

// A slash command at a word boundary, optionally with an <argument> slot: /poteto-mode, /verify-<app>.
const SLASH_COMMAND = /(?<=^|\s)\/[a-z][\w-]*(?:<[^>\s]+>[\w-]*)?(?![\w/])/g;

/**
 * Colors agent slash commands inside plain-text fences, which the highlighter otherwise
 * leaves as one flat run of text.
 */
export function slashCommands({ color }: { color: string }): ShikiTransformer {
  return {
    name: 'slash-commands',
    tokens(lines) {
      if (this.options.lang !== 'text') return;
      return lines.map((line) => line.flatMap((token) => splitToken(token, color)));
    },
  };
}

function splitToken(token: ThemedToken, color: string): ThemedToken[] {
  const parts: ThemedToken[] = [];
  let cursor = 0;

  for (const match of token.content.matchAll(SLASH_COMMAND)) {
    if (match.index > cursor) parts.push(slice(token, cursor, match.index));
    parts.push({ ...slice(token, match.index, match.index + match[0].length), color });
    cursor = match.index + match[0].length;
  }

  if (cursor === 0) return [token];
  if (cursor < token.content.length) parts.push(slice(token, cursor, token.content.length));
  return parts;
}

function slice(token: ThemedToken, start: number, end: number): ThemedToken {
  return { ...token, content: token.content.slice(start, end), offset: token.offset + start };
}
