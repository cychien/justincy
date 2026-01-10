import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  category: 'post' | 'book-review';
  tags?: string[];
  coverImage?: string;
  bookAuthor?: string;
  bookRating?: number;
}

const POSTS_PATH = path.join(process.cwd(), 'app/content/posts');
const BOOK_REVIEWS_PATH = path.join(process.cwd(), 'app/content/book-reviews');

function formatDateToString(date: unknown): string {
  if (!date) return new Date().toISOString().split('T')[0];
  if (date instanceof Date) return date.toISOString().split('T')[0];
  if (typeof date === 'string') return date;
  return new Date().toISOString().split('T')[0];
}

function getPostsFromDirectory(directory: string, category: 'post' | 'book-review'): PostMeta[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files = fs.readdirSync(directory);
  const posts = files
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => {
      const filePath = path.join(directory, file);
      const source = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(source);
      const slug = file.replace(/\.mdx$/, '');

      return {
        slug,
        title: data.title || slug,
        date: formatDateToString(data.date),
        excerpt: data.excerpt || '',
        category,
        tags: data.tags || [],
        coverImage: data.coverImage,
        bookAuthor: data.bookAuthor,
        bookRating: data.bookRating,
      } as PostMeta;
    });

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getAllPosts(): PostMeta[] {
  const posts = getPostsFromDirectory(POSTS_PATH, 'post');
  const bookReviews = getPostsFromDirectory(BOOK_REVIEWS_PATH, 'book-review');
  return [...posts, ...bookReviews].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getPosts(): PostMeta[] {
  return getPostsFromDirectory(POSTS_PATH, 'post');
}

export function getBookReviews(): PostMeta[] {
  return getPostsFromDirectory(BOOK_REVIEWS_PATH, 'book-review');
}

export function getPostBySlug(
  slug: string,
  category: 'post' | 'book-review'
): { meta: PostMeta; content: string } | null {
  const directory = category === 'post' ? POSTS_PATH : BOOK_REVIEWS_PATH;
  const filePath = path.join(directory, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const source = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(source);

  // 使用 marked 將 Markdown 轉換為 HTML
  const htmlContent = marked(content, {
    gfm: true,
    breaks: true,
  });

  return {
    meta: {
      slug,
      title: data.title || slug,
      date: formatDateToString(data.date),
      excerpt: data.excerpt || '',
      category,
      tags: data.tags || [],
      coverImage: data.coverImage,
      bookAuthor: data.bookAuthor,
      bookRating: data.bookRating,
    },
    content: htmlContent as string,
  };
}
