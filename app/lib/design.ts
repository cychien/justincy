/** The frontmatter contract for app/content/design - read by both the index and the post. */
export interface DesignPostFrontmatter {
  title: string;
  date: string;
  /** Genre label shown in the header separator, e.g. 設計拆解. */
  kind?: string;
  /** Path without extension; the post page appends `.webp` and `-800.webp` for its srcset. */
  image: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  /** Top-cropped 4:3 card image. Full path, extension included. */
  thumb: string;
}

/**
 * A post's slug is its filename. Both design routes derive it from the same
 * import.meta.glob keys and must agree, or the index links 404.
 */
export function slugFromModulePath(modulePath: string): string {
  return modulePath.replace(/^.*\//, '').replace(/\.mdx$/, '');
}
