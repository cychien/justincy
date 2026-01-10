import { PostCard } from '~/components/PostCard';
import { getPosts } from '~/lib/posts.server';
import type { Route } from './+types/posts._index';

export function meta({}: Route.MetaArgs) {
  return [{ title: '文章 - 我的部落格' }, { name: 'description', content: '瀏覽所有文章' }];
}

export async function loader({}: Route.LoaderArgs) {
  const posts = getPosts();
  return { posts };
}

export default function PostsIndex({ loaderData }: Route.ComponentProps) {
  const { posts } = loaderData;

  return (
    <div className="animate-fade-in mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          文章
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          分享我的想法、學習筆記與生活觀察。
        </p>
      </div>

      {/* Posts Grid */}
      {posts.length > 0 ? (
        <div className="grid gap-8">
          {posts.map((post, index) => (
            <PostCard key={post.slug} post={post} featured={index === 0} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">還沒有文章，敬請期待！</p>
        </div>
      )}
    </div>
  );
}
