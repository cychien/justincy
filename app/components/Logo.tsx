import { cn } from '~/lib/utils';

const MESH = [
  'radial-gradient(at 30% 30%, #b18cff 0, transparent 45%)',
  'radial-gradient(at 70% 25%, #5b8cff 0, transparent 45%)',
  'radial-gradient(at 70% 70%, #7b5cff 0, transparent 45%)',
  'radial-gradient(at 30% 72%, #62c6ff 0, transparent 45%)',
  '#7a86ff',
].join(', ');

export function Logo({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="justincy"
      className={cn('relative isolate block size-7 overflow-hidden rounded-full', className)}
    >
      {/* Oversized so the spin keeps the ball covered; the blur melts the stops into a mesh. */}
      <span
        className="absolute -inset-1/2 animate-[spin_14s_linear_infinite] blur-[3px] motion-reduce:animate-none"
        style={{ background: MESH }}
      />
      <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_26%,rgb(255_255_255/0.6),transparent_42%)] shadow-[inset_0_-3px_6px_rgb(0_0_0/0.18)]" />
    </span>
  );
}
