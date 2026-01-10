import { Link } from 'react-router';
import { Calendar, ArrowRight, BookOpen, Star } from 'lucide-react';
import { formatDate, cn } from '~/lib/utils';
import type { PostMeta } from '~/lib/posts.server';

interface PostCardProps {
  post: PostMeta;
  featured?: boolean;
}

export function PostCard({ post, featured = false }: PostCardProps) {
  const href = post.category === 'book-review' ? `/books/${post.slug}` : `/posts/${post.slug}`;

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100/50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:shadow-gray-900/50',
        featured && 'md:flex-row'
      )}
    >
      {/* Cover Image */}
      {post.coverImage && (
        <div
          className={cn(
            'relative overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950 dark:to-purple-950',
            featured ? 'md:w-2/5' : 'aspect-[16/9]'
          )}
        >
          <img
            src={post.coverImage}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className={cn('flex flex-1 flex-col p-6', featured && 'md:p-8')}>
        {/* Category Badge */}
        <div className="mb-3 flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
              post.category === 'book-review'
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
            )}
          >
            {post.category === 'book-review' ? (
              <>
                <BookOpen className="h-3 w-3" />
                讀書心得
              </>
            ) : (
              '文章'
            )}
          </span>
          {post.bookRating && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <Star className="h-3 w-3 fill-current" />
              {post.bookRating}/5
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className={cn(
            'font-semibold tracking-tight text-gray-900 dark:text-white',
            featured ? 'text-2xl' : 'text-lg'
          )}
        >
          <Link to={href} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h3>

        {/* Book Author */}
        {post.bookAuthor && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">作者：{post.bookAuthor}</p>
        )}

        {/* Excerpt */}
        <p
          className={cn(
            'mt-3 line-clamp-2 text-gray-600 dark:text-gray-400',
            featured ? 'text-base' : 'text-sm'
          )}
        >
          {post.excerpt}
        </p>

        {/* Meta */}
        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-500">
            <Calendar className="h-4 w-4" />
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition-colors group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-300">
            閱讀更多
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
