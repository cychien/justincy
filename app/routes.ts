import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('posts', 'routes/posts._index.tsx'),
  route('posts/:slug', 'routes/posts.$slug.tsx'),
  route('books', 'routes/books._index.tsx'),
  route('books/:slug', 'routes/books.$slug.tsx'),
  route('social', 'routes/social.tsx'),
  route('about', 'routes/about.tsx'),
] satisfies RouteConfig;
