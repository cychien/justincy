interface YouTubeProps {
  id: string;
  /** Read out by screen readers in place of the video. */
  title: string;
  /** Seconds into the video to start from. */
  start?: number;
}

export function YouTube({ id, title, start }: YouTubeProps) {
  const src = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
  if (start) src.searchParams.set('start', String(start));

  return (
    <iframe
      src={src.toString()}
      title={title}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      // YouTube refuses to play embeds that arrive without a referrer.
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      className="bg-muted border-border/80 aspect-video w-full rounded-xl border"
    />
  );
}
