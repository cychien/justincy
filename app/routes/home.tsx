import { Link } from 'react-router';
import { ArrowRight, BookOpen, Newspaper, MessageCircle } from 'lucide-react';
import { PostCard } from '~/components/PostCard';
import { SocialCard } from '~/components/SocialCard';
import { getAllPosts } from '~/lib/posts.server';
import { getSocialPosts } from '~/lib/social';
import type { Route } from './+types/home';

export function meta({}: Route.MetaArgs) {
  return [
    { title: '我的部落格 - 分享閱讀與思考' },
    {
      name: 'description',
      content: '分享讀書心得、文章與社群動態的個人部落格',
    },
  ];
}

export async function loader({}: Route.LoaderArgs) {
  const posts = getAllPosts();
  const socialPosts = getSocialPosts();

  return {
    featuredPost: posts[0] || null,
    recentPosts: posts.slice(1, 4),
    recentSocialPosts: socialPosts.slice(0, 3),
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { featuredPost, recentPosts, recentSocialPosts } = loaderData;

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/20 dark:via-gray-950 dark:to-purple-950/20" />
          <div className="absolute top-0 right-0 -z-10 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-900/20" />
          <div className="absolute bottom-0 left-0 -z-10 h-96 w-96 rounded-full bg-purple-200/30 blur-3xl dark:bg-purple-900/20" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white">
              歡迎來到
              <span className="gradient-text"> 我的部落格</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-400">
              這裡是我分享閱讀心得、思考與生活的空間。
              透過文字記錄學習的過程，也希望能與你產生一些共鳴。
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/posts"
                className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-gray-800 hover:shadow-xl dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                瀏覽文章
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/books"
                className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800"
              >
                <BookOpen className="h-4 w-4" />
                讀書心得
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {featuredPost && (
        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              精選文章
            </h2>
          </div>
          <PostCard post={featuredPost} featured />
        </section>
      )}

      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              <Newspaper className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              最新文章
            </h2>
            <Link
              to="/posts"
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentPosts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* Social Feed */}
      {recentSocialPosts.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              <MessageCircle className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              社群動態
            </h2>
            <Link
              to="/social"
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentSocialPosts.map((post) => (
              <SocialCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-600 to-purple-700 p-8 text-center sm:p-12">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyek0zNCAyNGgtMnY0aDJ2LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <h2 className="relative text-2xl font-bold text-white sm:text-3xl">
            想要收到最新文章通知？
          </h2>
          <p className="relative mt-4 text-indigo-100">
            追蹤我的社群帳號，或訂閱電子報，不錯過任何新內容。
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="https://threads.net"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-indigo-600 transition-all hover:bg-indigo-50"
            >
              追蹤 Threads
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/20"
            >
              追蹤 Twitter
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
