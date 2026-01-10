import { PostCard } from '~/components/PostCard';
import { getBookReviews } from '~/lib/posts.server';
import type { Route } from './+types/books._index';

export function meta({}: Route.MetaArgs) {
  return [
    { title: '讀書心得 - 我的部落格' },
    { name: 'description', content: '分享我的閱讀心得與書評' },
  ];
}

export async function loader({}: Route.LoaderArgs) {
  const bookReviews = getBookReviews();
  return { bookReviews };
}

export default function BooksIndex({ loaderData }: Route.ComponentProps) {
  const { bookReviews } = loaderData;

  return (
    <div className="animate-fade-in mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          讀書心得
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          閱讀是與作者對話的過程，這裡記錄了我的閱讀旅程與收穫。
        </p>
      </div>

      {/* Book Reviews Grid */}
      {bookReviews.length > 0 ? (
        <div className="grid gap-8 sm:grid-cols-2">
          {bookReviews.map((review) => (
            <PostCard key={review.slug} post={review} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">還沒有讀書心得，敬請期待！</p>
        </div>
      )}
    </div>
  );
}
