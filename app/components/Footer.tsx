import { Link } from 'react-router';
import { Github, Twitter, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/50">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">我的部落格</span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-6 text-sm">
            <Link
              to="/posts"
              className="text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              文章
            </Link>
            <Link
              to="/books"
              className="text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              讀書心得
            </Link>
            <Link
              to="/social"
              className="text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              社群動態
            </Link>
            <Link
              to="/about"
              className="text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              關於
            </Link>
          </nav>

          {/* Social */}
          <div className="flex gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-500 dark:hover:text-white"
            >
              <span className="sr-only">GitHub</span>
              <Github className="h-5 w-5" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-500 dark:hover:text-white"
            >
              <span className="sr-only">Twitter</span>
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="mailto:hello@example.com"
              className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-500 dark:hover:text-white"
            >
              <span className="sr-only">Email</span>
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-gray-200 pt-8 text-center dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            © {new Date().getFullYear()} 我的部落格. 保留所有權利.
          </p>
        </div>
      </div>
    </footer>
  );
}
