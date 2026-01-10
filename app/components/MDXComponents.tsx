import type { ComponentPropsWithoutRef } from 'react';

// MDX 內容的自訂元件樣式
export const mdxComponents = {
  h1: (props: ComponentPropsWithoutRef<'h1'>) => (
    <h1
      className="mt-12 mb-4 text-3xl font-bold tracking-tight text-gray-900 first:mt-0 dark:text-white"
      {...props}
    />
  ),
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2
      className="mt-10 mb-4 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white"
      {...props}
    />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3
      className="mt-8 mb-3 text-xl font-semibold tracking-tight text-gray-900 dark:text-white"
      {...props}
    />
  ),
  h4: (props: ComponentPropsWithoutRef<'h4'>) => (
    <h4 className="mt-6 mb-2 text-lg font-semibold text-gray-900 dark:text-white" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p className="my-4 leading-7 text-gray-700 dark:text-gray-300" {...props} />
  ),
  a: (props: ComponentPropsWithoutRef<'a'>) => (
    <a
      className="font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 transition-colors hover:text-indigo-700 hover:decoration-indigo-400 dark:text-indigo-400 dark:decoration-indigo-700 dark:hover:text-indigo-300"
      {...props}
    />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="my-4 ml-6 list-disc space-y-2 text-gray-700 dark:text-gray-300" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="my-4 ml-6 list-decimal space-y-2 text-gray-700 dark:text-gray-300" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<'li'>) => <li className="leading-7" {...props} />,
  blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote
      className="my-6 border-l-4 border-indigo-300 bg-indigo-50/50 py-4 pr-4 pl-6 text-gray-700 italic dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-gray-300"
      {...props}
    />
  ),
  code: (props: ComponentPropsWithoutRef<'code'>) => (
    <code
      className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      {...props}
    />
  ),
  pre: (props: ComponentPropsWithoutRef<'pre'>) => (
    <pre
      className="my-6 overflow-x-auto rounded-xl bg-gray-900 p-4 text-sm dark:bg-gray-950"
      {...props}
    />
  ),
  hr: (props: ComponentPropsWithoutRef<'hr'>) => (
    <hr className="my-8 border-gray-200 dark:border-gray-800" {...props} />
  ),
  table: (props: ComponentPropsWithoutRef<'table'>) => (
    <div className="my-6 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800" {...props} />
    </div>
  ),
  th: (props: ComponentPropsWithoutRef<'th'>) => (
    <th
      className="bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:bg-gray-900 dark:text-white"
      {...props}
    />
  ),
  td: (props: ComponentPropsWithoutRef<'td'>) => (
    <td
      className="border-t border-gray-200 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300"
      {...props}
    />
  ),
  img: (props: ComponentPropsWithoutRef<'img'>) => <img className="my-6 rounded-xl" {...props} />,
};
