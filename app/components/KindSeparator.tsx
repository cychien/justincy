import { cn } from '~/lib/utils';

// Each genre keeps one color everywhere it appears, so no two genres share a tone.
const KIND_TONES: Record<string, string> = {
  設計拆解: 'bg-lime-200 text-lime-900',
  'AI 工作流': 'bg-orange-200 text-orange-900',
};

// The separator borrows the viewer's annotation-dot vocabulary - a hint of how a post
// is meant to be read - and names the genre in the middle.
export function KindSeparator({ kind, className }: { kind?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span aria-hidden="true" className="border-border w-12 border-t border-dashed" />
      {kind ? (
        <span
          className={cn(
            'flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] leading-7 font-medium tracking-wide',
            KIND_TONES[kind] ?? 'bg-muted text-foreground'
          )}
        >
          {kind}
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="size-2 rounded-full bg-blue-500 ring-4 ring-blue-500/15"
        />
      )}
      <span aria-hidden="true" className="border-border w-12 border-t border-dashed" />
    </div>
  );
}
