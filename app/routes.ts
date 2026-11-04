import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('products', 'routes/products.tsx'),
  route('design', 'routes/design.tsx'),
  route('design/:slug', 'routes/design.post.tsx'),
  route(':section', 'routes/articles.tsx'),
  route(':section/:slug', 'routes/articles.post.tsx'),
] satisfies RouteConfig;
