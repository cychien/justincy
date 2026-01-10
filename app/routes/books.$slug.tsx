import { Link } from 'react-router';
import { Calendar, ArrowLeft, Tag, Star, User } from 'lucide-react';
import { formatDate } from '~/lib/utils';
import type { Route } from './+types/books.$slug';

export function meta({ data }: Route.MetaArgs) {
  if (!data?.post) {
    return [{ title: '讀書心得未找到 - 我的部落格' }];
  }
  return [
    { title: `${data.post.meta.title} - 讀書心得 - 我的部落格` },
    { name: 'description', content: data.post.meta.excerpt },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { getPostBySlug } = await import('~/lib/posts.server');
  const post = getPostBySlug(params.slug!, 'book-review');
  if (!post) {
    throw new Response('Not Found', { status: 404 });
  }
  return { post };
}

export default function BookReviewDetail({ loaderData }: Route.ComponentProps) {
  const { post } = loaderData;

  return (
    <article className="animate-fade-in mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Back Link */}
      <Link
        to="/books"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        返回讀書心得
      </Link>

      {/* Header */}
      <header className="mb-12">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            讀書心得
          </span>
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-500">
            <Calendar className="h-4 w-4" />
            <time dateTime={post.meta.date}>{formatDate(post.meta.date)}</time>
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl dark:text-white">
          {post.meta.title}
        </h1>

        {/* Book Info */}
        <div className="mt-6 flex flex-wrap items-center gap-6 rounded-xl bg-amber-50/50 p-4 dark:bg-amber-950/20">
          {post.meta.bookAuthor && (
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>作者：{post.meta.bookAuthor}</span>
            </div>
          )}
          {post.meta.bookRating && (
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span>評分：{post.meta.bookRating} / 5</span>
            </div>
          )}
        </div>

        {post.meta.excerpt && (
          <p className="mt-6 text-xl leading-8 text-gray-600 dark:text-gray-400">
            {post.meta.excerpt}
          </p>
        )}

        {post.meta.tags && post.meta.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Tag className="h-4 w-4 text-gray-400" />
            {post.meta.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Cover Image */}
      {post.meta.coverImage && (
        <div className="mb-12 overflow-hidden rounded-2xl">
          <img
            src={post.meta.coverImage}
            alt={post.meta.title}
            className="h-auto w-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div
        className="prose prose-lg dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-7 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-amber-600 dark:prose-a:text-amber-400 prose-blockquote:border-l-4 prose-blockquote:border-amber-300 prose-blockquote:bg-amber-50/50 prose-blockquote:py-1 prose-blockquote:pl-6 prose-blockquote:italic dark:prose-blockquote:border-amber-700 dark:prose-blockquote:bg-amber-950/30 prose-code:rounded prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm dark:prose-code:bg-gray-800 prose-pre:rounded-xl prose-pre:bg-gray-900 prose-pre:p-4 max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 pt-8 dark:border-gray-800">
        <Link
          to="/books"
          className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 transition-colors hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
        >
          <ArrowLeft className="h-4 w-4" />
          返回讀書心得
        </Link>
      </footer>
    </article>
  );
}
