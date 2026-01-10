import { Heart, Repeat2, ExternalLink } from 'lucide-react';
import { formatRelativeDate, cn } from '~/lib/utils';
import type { SocialPost } from '~/lib/social';

// Threads 圖示
function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.332-3.023.85-.706 2.017-1.122 3.381-1.209.934-.06 1.87-.025 2.812.105.12-.49.166-.999.127-1.51-.106-1.395-.888-2.138-2.322-2.212-1.039-.053-1.91.26-2.442.884l-.168.197-1.58-1.18.196-.234c.89-1.058 2.228-1.596 3.973-1.506 2.374.117 3.927 1.553 4.142 3.828.042.448.042.9-.002 1.358 1.031.504 1.823 1.166 2.372 1.988.737 1.103 1.089 2.468.989 3.838-.216 2.94-1.9 5.263-4.622 6.37-1.387.564-2.953.844-4.665.834zm1.377-7.165c-.99.064-1.756.31-2.28.732-.39.314-.6.715-.576 1.1.024.387.238.737.603.985.5.34 1.204.52 1.98.477 1.2-.065 2.074-.503 2.6-1.302.341-.52.556-1.18.64-1.96-.91-.14-1.838-.152-2.967-.032z" />
    </svg>
  );
}

// Twitter/X 圖示
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface SocialCardProps {
  post: SocialPost;
}

export function SocialCard({ post }: SocialCardProps) {
  return (
    <article className="group relative rounded-2xl border border-gray-100 bg-white p-5 transition-all duration-300 hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100/50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:shadow-gray-900/50">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Platform Icon */}
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full',
              post.platform === 'threads'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
            )}
          >
            {post.platform === 'threads' ? (
              <ThreadsIcon className="h-5 w-5" />
            ) : (
              <XIcon className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {post.platform === 'threads' ? 'Threads' : 'X / Twitter'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {formatRelativeDate(post.date)}
            </p>
          </div>
        </div>
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Content */}
      <p className="mt-4 leading-relaxed text-gray-700 dark:text-gray-300">{post.content}</p>

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className="mt-4 grid gap-2">
          {post.media.map((item, index) => (
            <div key={index} className="overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
              {item.type === 'image' && (
                <img src={item.url} alt={item.alt || ''} className="h-auto w-full object-cover" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 flex items-center gap-6 border-t border-gray-100 pt-4 dark:border-gray-800">
        {post.likes !== undefined && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-500">
            <Heart className="h-4 w-4" />
            <span>{post.likes}</span>
          </div>
        )}
        {post.reposts !== undefined && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-500">
            <Repeat2 className="h-4 w-4" />
            <span>{post.reposts}</span>
          </div>
        )}
      </div>
    </article>
  );
}
