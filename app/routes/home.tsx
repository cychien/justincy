import { ArrowRightCircleIcon } from '@heroicons/react/16/solid';
import { Link } from 'react-router';

import { cn } from '~/lib/utils';

const SECTIONS = [
  { label: 'Components', to: '/components', blurb: 'UI 元件美觀與易用性的探索，可以直接下載使用' },
  { label: 'Design', to: '/design', blurb: 'UI 作品、設計方法與筆記' },
  { label: 'System', to: '/system', blurb: '如何把系統做得穩固、安全、可擴展' },
  { label: 'Blog', to: '/blog', blurb: '人生及日常分享' },
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
    <section className="flex flex-col gap-6 py-4 sm:py-10 sm:flex-row sm:gap-8">
      <img
        src="/avatar.jpg"
        alt="Justin Chien"
        width={400}
        height={400}
        className="bg-muted size-28 shrink-0 rounded-lg object-cover"
      />

      <div className="text-muted-foreground space-y-5 text-sm leading-relaxed tracking-wide">
        <h1 className="text-foreground text-xl font-semibold tracking-normal">Justin Chien</h1>
        <p>
          我是一名軟體工程師，特別追求於<b className={EMPHASIS_STYLE}>介面設計與細節</b>
          ，擅長打造介面精緻、使用滑順的應用產品。
        </p>
        <p>我在這裡分享我熱愛、也可能幫得上你的東西：</p>
        {/* The whole row is the link, so it's a list of links rather than a dl —
            no anchor can span a dt/dd pair. -mx-2 lets the hover fill bleed past
            the text column while the labels stay aligned with the copy above. */}
        <ul className="divide-border/80 -mx-2 divide-y">
          {SECTIONS.map(({ label, to, blurb }) => (
            <li key={to}>
              {/* leading-6 instead of the inherited leading-relaxed: 14px × 1.625 is
                  22.75px, and that fraction puts every row on a different subpixel
                  offset, so the centred icon rounds to a different pixel each row. */}
              <Link
                className="hover:bg-muted/50 flex cursor-pointer items-start px-2 py-1.5 leading-6 transition-colors group"
                to={to}
              >
                <span
                  className={cn(
                    EMPHASIS_STYLE,
                    'flex w-32 shrink-0 items-center gap-1.75 font-medium tracking-normal'
                  )}
                >
                  <ArrowRightCircleIcon
                    className="text-muted-foreground/38 size-3.25 shrink-0 group-hover:text-muted-foreground/70 transition-colors"
                    aria-hidden="true"
                  />
                  {label}
                </span>
                <span>{blurb}</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="pt-1">如果對我的 work 感興趣，或想給我 feedback，歡迎找我聊聊 :)</p>
      </div>
    </section>
  );
}
