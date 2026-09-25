import { ArrowRightCircleIcon } from '@heroicons/react/16/solid';
import { Link } from 'react-router';

import { cn } from '~/lib/utils';

const SECTIONS = [
  { label: 'Components', to: '/components', blurb: 'UI 元件美觀與易用性的探索，可以直接下載使用' },
  { label: 'Design', to: '/design', blurb: 'UI 作品、設計方法與筆記' },
  { label: 'System', to: '/system', blurb: '如何把系統做得穩固、安全、可擴展' },
  { label: 'Blog', to: '/blog', blurb: '人生感悟及日常分享' },
];

const EMPHASIS_STYLE = 'text-foreground font-[550]';

export function meta() {
  return [
    { title: 'justincy' },
    {
      name: 'description',
      content: 'Justin Chien — 軟體工程師，做精緻、滑順、跑得飛快的網頁產品。',
    },
  ];
}

export default function Home() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-4 pb-24 sm:flex-row sm:gap-8 sm:py-10">
      <img
        src="/avatar.jpg"
        alt="Justin Chien"
        width={400}
        height={400}
        className="bg-muted size-20 shrink-0 rounded-xl object-cover"
      />

      <div className="space-y-6 text-[15px] leading-relaxed tracking-wide text-zinc-500">
        <h1 className="text-foreground text-xl font-semibold tracking-normal">Justin Chien</h1>
        <p>
          軟體工程師，<b className={EMPHASIS_STYLE}>熱愛介面設計與細節</b>
          ，喜歡做產品，擅於打造介面精緻、使用滑順的應用產品。
        </p>
        <p>我在這裡分享：</p>
        <ul className="divide-border/80 -mx-2 divide-y">
          {SECTIONS.map(({ label, to, blurb }) => (
            <li key={to}>
              <Link
                className="hover:bg-muted/50 group flex cursor-pointer items-start px-2 py-1.5 leading-6 transition-colors"
                to={to}
              >
                <span
                  className={cn(
                    EMPHASIS_STYLE,
                    'flex w-32 shrink-0 items-center gap-1.75 font-medium tracking-normal'
                  )}
                >
                  <ArrowRightCircleIcon
                    className="text-muted-foreground/38 group-hover:text-muted-foreground/70 size-3.25 shrink-0 -translate-y-[0.5px] transition-colors"
                    aria-hidden="true"
                  />
                  {label}
                </span>
                <span>{blurb}</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="pt-1">如果對我的 work 感興趣，歡迎找我聊聊 😊</p>
      </div>
    </section>
  );
}
