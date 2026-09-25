import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('design', 'routes/design.tsx'),
  route('design/:slug', 'routes/design.post.tsx'),
] satisfies RouteConfig;
