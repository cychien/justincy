import { Link } from 'react-router';
import { Github, Twitter, Mail, BookOpen, Newspaper, MessageCircle } from 'lucide-react';
import type { Route } from './+types/about';

export function meta({}: Route.MetaArgs) {
  return [{ title: '關於 - 我的部落格' }, { name: 'description', content: '關於這個部落格和作者' }];
}

export default function About() {
  return (
    <div className="animate-fade-in mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 text-center">
        {/* Avatar */}
        <div className="mx-auto mb-6 h-32 w-32 overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-4xl font-bold text-indigo-600 dark:bg-gray-900 dark:text-indigo-400">
            你
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          關於我
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          一個喜歡閱讀、思考和分享的人
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-lg dark:prose-invert mx-auto">
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          嗨，歡迎來到我的部落格！這裡是我記錄閱讀心得、分享想法的空間。
          我相信寫作是最好的思考方式，透過文字整理思緒，也希望能與更多人交流。
        </p>

        <h2 className="mt-10 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">
          為什麼寫部落格？
        </h2>
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          在這個資訊爆炸的時代，我發現自己需要一個地方來沉澱思緒。
          部落格不只是分享，更是一種自我對話的過程。當我試著把想法寫下來時，
          常常會發現自己對某個主題的理解其實不如想像中深入。
        </p>

        <h2 className="mt-10 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">
          這裡有什麼？
        </h2>
        <div className="not-prose mt-6 grid gap-4 sm:grid-cols-3">
          <Link
            to="/posts"
            className="group rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-indigo-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-700"
          >
            <Newspaper className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">文章</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              想法、學習筆記與生活觀察
            </p>
          </Link>
          <Link
            to="/books"
            className="group rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-amber-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-amber-700"
          >
            <BookOpen className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">讀書心得</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">閱讀旅程與書評分享</p>
          </Link>
          <Link
            to="/social"
            className="group rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-purple-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-purple-700"
          >
            <MessageCircle className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">社群動態</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Threads 和 Twitter 上的短想法
            </p>
          </Link>
        </div>

        <h2 className="mt-10 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">聯繫我</h2>
        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
          如果你想交流想法、推薦好書，或只是想打個招呼，歡迎透過以下方式聯繫我：
        </p>
      </div>

      {/* Social Links */}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800"
        >
          <Github className="h-4 w-4" />
          GitHub
        </a>
        <a
          href="https://twitter.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800"
        >
          <Twitter className="h-4 w-4" />
          Twitter
        </a>
        <a
          href="mailto:hello@example.com"
          className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800"
        >
          <Mail className="h-4 w-4" />
          Email
        </a>
      </div>
    </div>
  );
}
