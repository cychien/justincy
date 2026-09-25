import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import { SiteHeader } from '~/components/SiteHeader';

import type { Route } from './+types/root';
import './styles/globals.css';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-svh antialiased">
        <SiteHeader />
        {/* Each route owns its own measure — reading pages stay narrow, pages that
            place an image beside the text need the extra width. */}
        <main>{children}</main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = '糟糕！';
  let details = '發生了意外錯誤';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : '錯誤';
    details = error.status === 404 ? '找不到您請求的頁面' : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <section className="text-muted-foreground mx-auto w-full max-w-2xl space-y-3 px-6 py-10 text-sm leading-relaxed">
      <h1 className="text-foreground text-base font-semibold tracking-tight">{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="bg-muted overflow-x-auto rounded-lg border p-4 text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </section>
  );
}
