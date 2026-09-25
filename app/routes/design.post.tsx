import { format, parseISO } from 'date-fns';
import { useMemo } from 'react';

import {
  Annotation,
  ImageAnnotations,
  type ImageAnnotationsProps,
} from '~/components/ImageAnnotations';
import { Beat, Info, InfoArchitecture } from '~/components/InfoArchitecture';
import { slugFromModulePath, type DesignPostFrontmatter } from '~/lib/design';

import type { Route } from './+types/design.post';

interface PostModule {
  default: (props: { components?: Record<string, React.ComponentType<never>> }) => React.ReactNode;
  frontmatter: DesignPostFrontmatter;
}

// Eager: every design post compiles into this route's bundle, which keeps SSR and
// hydration free of suspense. Revisit if the collection outgrows a personal blog.
const modules = import.meta.glob('../content/design/*.mdx', {
  eager: true,
}) as Record<string, PostModule>;

const posts = new Map(
  Object.entries(modules).map(([modulePath, mod]) => [slugFromModulePath(modulePath), mod])
);

// Prose blocks read at a narrow measure; a data-wide block sets its own, because it is
// a figure rather than a paragraph. Links carry themselves with an underline instead of
// a colour, so a sentence in the muted column keeps one voice; hover firms the line up.
const PROSE = `
  mdx-lists text-muted-foreground space-y-6 text-base leading-relaxed tracking-wide
  [&>:not([data-wide])]:mx-auto [&>:not([data-wide])]:max-w-2xl
  [&>h2]:text-foreground [&>h2]:pt-4 [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:tracking-normal
  [&_strong]:text-foreground [&_strong]:font-medium
  [&_a]:text-foreground [&_a]:underline [&_a]:decoration-border [&_a]:underline-offset-3
  [&_a]:transition-colors [&_a:hover]:decoration-muted-foreground
`;

export function loader({ params }: Route.LoaderArgs) {
  const post = posts.get(params.slug);
  if (!post) throw new Response('找不到這篇文章', { status: 404 });
  return { slug: params.slug, frontmatter: post.frontmatter };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: loaderData ? `${loaderData.frontmatter.title} - justincy` : 'justincy' }];
}

export default function DesignPost({ loaderData }: Route.ComponentProps) {
  const { slug, frontmatter } = loaderData;
  const { title, date, kind, image, imageAlt, imageWidth, imageHeight } = frontmatter;
  const Content = posts.get(slug)!.default;

  // The author writes a bare <ImageAnnotations> / <InfoArchitecture> in MDX; both read
  // the post's screenshot, whose contract lives in frontmatter, so the route binds it
  // here instead of repeating it in every body that wants it.
  // Each wrapper owns this page's breathing room around its component (padding, so it
  // can't fight space-y margins) and opts out of the prose measure via data-wide -
  // spacing and width are layout concerns, not the components'.
  const components = useMemo(
    () => ({
      Annotation,
      ImageAnnotations: (
        props: Pick<ImageAnnotationsProps, 'mode' | 'defaultView' | 'children'>
      ) => (
        <div data-wide="" className="py-1 md:py-2.5 lg:py-4">
          <ImageAnnotations
            image={image}
            imageAlt={imageAlt}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            {...props}
          />
        </div>
      ),
      Beat,
      Info,
      InfoArchitecture: (props: { children?: React.ReactNode }) => (
        <div data-wide="" className="py-2">
          <InfoArchitecture
            image={image}
            imageAlt={imageAlt}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            {...props}
          />
        </div>
      ),
    }),
    [image, imageAlt, imageWidth, imageHeight]
  );

  return (
    <article className="mx-auto w-full max-w-360 px-6 pb-24">
      <header className="mx-auto flex max-w-2xl flex-col items-center gap-2 py-4 sm:py-10">
        <h1 className="text-foreground text-2xl font-semibold tracking-normal">{title}</h1>
        <time dateTime={date} className="text-muted-foreground/60 block text-sm tracking-wide">
          {format(parseISO(date), 'yyyy.MM.dd')}
        </time>
        {/* The separator borrows the viewer's annotation-dot vocabulary - a hint of
            how this post is meant to be read - and names the genre in the middle. */}
        <div className="mt-7 flex items-center gap-3">
          <span aria-hidden="true" className="border-border w-12 border-t border-dashed" />
          {kind ? (
            <span className="flex h-7 items-center gap-1.5 rounded-full bg-lime-200 px-3 text-[13px] leading-7 font-medium tracking-wide text-lime-900">
              {/* <span aria-hidden="true" className="size-1.5 rounded-full bg-blue-500" /> */}
              {kind}
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-blue-500 ring-4 ring-blue-500/15"
            />
          )}
          <span aria-hidden="true" className="border-border w-12 border-t border-dashed" />
        </div>
      </header>

      <div className={PROSE}>
        <Content components={components} />
      </div>
    </article>
  );
}
