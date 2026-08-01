# CLAUDE.md

## Comments

- Write comments in English.
- Default to no comment. Well-named code is the explanation.
- Only comment what the code cannot show: a non-obvious constraint, a workaround and the
  bug it works around, a deliberate deviation from the obvious approach, or a reason a
  value must be exactly what it is. Explain the _why_, never restate the _what_.
- Delete a comment when the code it justified changes. A stale comment is worse than none.

```ts
// Bad — restates the code
// create the markdown processor
function createProcessor() {}

// Good — states what the reader cannot see
// Shiki needs the full source; streaming it truncates multi-line token scopes.
const source = await readFile(path, 'utf-8');
```
