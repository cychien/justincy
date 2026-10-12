/**
 * A post's slug is its filename. Each section's index and post routes derive it from
 * the same import.meta.glob keys and must agree, or the index links 404.
 */
export function slugFromModulePath(modulePath: string): string {
  return modulePath.replace(/^.*\//, '').replace(/\.mdx$/, '');
}
