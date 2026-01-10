import { useState } from 'react';
import { SocialCard } from '~/components/SocialCard';
import { getSocialPosts } from '~/lib/social';
import { cn } from '~/lib/utils';
import type { Route } from './+types/social';

export function meta({}: Route.MetaArgs) {
  return [
    { title: '社群動態 - 我的部落格' },
    { name: 'description', content: '我在 Threads 和 Twitter 上的發文' },
  ];
}

export async function loader({}: Route.LoaderArgs) {
  const socialPosts = getSocialPosts();
  return { socialPosts };
}

type FilterType = 'all' | 'threads' | 'twitter';

export default function Social({ loaderData }: Route.ComponentProps) {
  const { socialPosts } = loaderData;
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredPosts =
    filter === 'all' ? socialPosts : socialPosts.filter((post) => post.platform === filter);

  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'threads', label: 'Threads' },
    { value: 'twitter', label: 'Twitter / X' },
  ];

  return (
    <div className="animate-fade-in mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          社群動態
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          我在 Threads 和 Twitter 上分享的短想法與日常。
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-8 flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-all',
              filter === f.value
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Social Posts Grid */}
      {filteredPosts.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {filteredPosts.map((post) => (
            <SocialCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">還沒有社群動態，敬請期待！</p>
        </div>
      )}

      {/* Social Links */}
      <div className="mt-16 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-8 text-center dark:from-gray-900 dark:to-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">追蹤我的社群帳號</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">即時獲取最新的想法與更新</p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <a
            href="https://threads.net"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            追蹤 Threads
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-700"
          >
            追蹤 Twitter
          </a>
        </div>
      </div>
    </div>
  );
}
