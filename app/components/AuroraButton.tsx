import type { ComponentProps } from 'react';

import { cn } from '~/lib/utils';

const SURFACE = [
  'radial-gradient(ellipse 55% 90% at 50% 0%, rgb(255 255 255 / 0.07), transparent 70%) padding-box',
  'linear-gradient(#0b0b0b, #050505) padding-box',
  'linear-gradient(rgb(255 255 255 / 0.3), rgb(255 255 255 / 0.14) 45%, rgb(255 255 255 / 0.62)) border-box',
].join(', ');

const BLOBS = [
  {
    className:
      '-left-[6%] h-[95%] w-[62%] translate-y-[45%] blur-[4px] animate-[aurora-warm_7s_ease-in-out_infinite_alternate]',
    background:
      'radial-gradient(closest-side, rgb(224 120 80 / 0.85), rgb(170 74 52 / 0.35) 55%, transparent)',
  },
  {
    className:
      '-right-[6%] h-[95%] w-[60%] translate-y-[45%] blur-[4px] animate-[aurora-cool_8s_ease-in-out_infinite_alternate]',
    background:
      'radial-gradient(closest-side, rgb(104 132 240 / 0.9), rgb(60 80 180 / 0.35) 55%, transparent)',
  },
  {
    className:
      'left-[40%] h-[60%] w-[38%] translate-y-[40%] blur-[4px] animate-[aurora-mint_6s_ease-in-out_infinite_alternate]',
    background: 'radial-gradient(closest-side, rgb(150 210 190 / 0.45), transparent)',
  },
  {
    className:
      'left-[18%] h-[90%] w-[64%] translate-y-[45%] blur-[4px] animate-[aurora-core_5s_ease-in-out_infinite_alternate]',
    background: 'radial-gradient(closest-side, rgb(255 255 255 / 0.4), transparent)',
  },
  {
    className:
      'left-[28%] h-[44%] w-[44%] translate-y-1/2 blur-[1px] animate-[aurora-core_5s_ease-in-out_infinite_alternate]',
    background:
      'radial-gradient(closest-side, #fff, rgb(255 255 255 / 0.85) 45%, rgb(255 255 255 / 0.15) 80%, transparent)',
  },
];

export function AuroraButton({ className, children, ...props }: ComponentProps<'a'>) {
  return (
    <a
      className={cn(
        'group focus-visible:outline-ring relative isolate inline-flex h-11 min-w-32 items-center justify-center overflow-hidden rounded-full border border-transparent px-5 text-[15px] font-medium tracking-normal text-white shadow-[0_2px_8px_-2px_rgb(0_0_0/0.25)] transition-transform duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-3 active:scale-[0.97]',
        className
      )}
      style={{ background: SURFACE }}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 origin-bottom opacity-85 transition-[opacity,scale] duration-500 ease-out group-hover:scale-y-110 group-hover:opacity-100"
      >
        {BLOBS.map(({ className, background }) => (
          <span
            key={className}
            className={cn(
              'absolute bottom-0 rounded-full mix-blend-screen motion-reduce:animate-none',
              className
            )}
            style={{ background }}
          />
        ))}
      </span>
      {children}
    </a>
  );
}
