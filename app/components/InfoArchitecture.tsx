import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { MotionConfig, motion } from 'motion/react';
import {
  Children,
  isValidElement,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { cn } from '~/lib/utils';

/**
 * The persuasion jobs a beat can hold, with their colours declared once: 信任 has to be
 * the same sky in every teardown, or the tint stops carrying meaning. Same pale 100/800
 * pairing as the annotation tags, so a reader who has learnt to read the notes already
 * knows what a tinted pill means here.
 */
const ROLE_TONES = {
  價值: 'bg-amber-100 text-amber-800',
  痛點: 'bg-rose-100 text-rose-800',
  解法: 'bg-emerald-100 text-emerald-800',
  廣度: 'bg-violet-100 text-violet-800',
  信任: 'bg-sky-100 text-sky-800',
  消除疑慮: 'bg-teal-100 text-teal-800',
  轉換: 'bg-blue-100 text-blue-800',
} as const;

export type BeatRole = keyof typeof ROLE_TONES;

// A role the map has never seen still gets a chip. MDX is not typechecked, so a closed
// vocabulary would silently render a new role as unstyled text - the failure would look
// like a typo in the post rather than a missing tone.
const ROLE_FALLBACK = 'bg-muted text-muted-foreground';

const toneFor = (role: string) => ROLE_TONES[role as BeatRole] ?? ROLE_FALLBACK;

interface BeatProps {
  /** The beat's name in the teardown, e.g. `Hero`, `Pricing`. */
  title: string;
  /** The job it does. Known values get their own tint; anything else reads neutral. */
  role?: string;
  /** The job this beat does, in one line. Reads collapsed, so keep it to one. */
  summary?: string;
  /** Row band of the post's full-page screenshot, in the image's own pixels. */
  from?: number;
  to?: number;
  /** `<Info>` items in reading order, plus any prose. Omit all three and the beat won't open. */
  children?: ReactNode;
}

// Marker elements: <InfoArchitecture> reads their props and renders the rows itself.
// Rendering plain children keeps a stray usage outside the wrapper from vanishing.
export function Beat({ children }: BeatProps) {
  return <div>{children}</div>;
}

interface InfoProps {
  /** The piece of information itself - a headline, a CTA, a proof point. */
  label: string;
  /** Why it sits at this point in the beat. */
  children?: ReactNode;
}

export function Info({ children }: InfoProps) {
  return <div>{children}</div>;
}

type BeatElement = ReactElement<BeatProps>;
type InfoElement = ReactElement<InfoProps>;

const isBeat = (node: ReactNode): node is BeatElement => isValidElement(node) && node.type === Beat;

const isInfo = (node: ReactNode): node is InfoElement => isValidElement(node) && node.type === Info;

interface Source {
  /** Extensionless path - `.webp` / `-800.webp` variants follow the site convention. */
  image?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export interface InfoArchitectureProps extends Source {
  children?: ReactNode;
}

const CHIP = 'rounded-[5px] px-1.5 text-xs leading-5 font-medium';

// Every beat's shell carries the border whether or not it is open, so opening tints a
// box rather than growing one and nudging the text a pixel across.
const SHELL = 'rounded-xl border border-transparent transition-colors';
const SHELL_OPEN = 'border-border bg-surface shadow-xs';

const HEADER =
  'focus-visible:ring-ring flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-hidden';

// mt-2 lands the node's centre on the header's first text line: 10px of padding plus
// half a 20px line is 20px down, and a 24px node offset by 8px centres there too.
const NODE =
  'relative z-10 mt-2 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums transition-colors';

const NOTE =
  'mdx-lists mdx-mark text-muted-foreground space-y-2 text-[13px] leading-relaxed tracking-wide';

// The rail's band marker is the list's node again, a size down: the same dark dot with the
// same number, so the mark on the page and the row in the list read as one thing.
//
// Literal zinc-900 rather than --primary, and it has to be: these marks sit on a
// screenshot, whose colours do not follow the reader's theme. In dark mode --primary
// inverts to near-white and the frame would vanish against a screenshot of a light page.
const RAIL_BADGE =
  'pointer-events-none absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-medium text-white tabular-nums transition-opacity';

const RAIL_BAND = 'absolute inset-x-0 cursor-pointer transition-colors';

const RAIL_BAND_ACTIVE = 'bg-zinc-900/5 ring-2 ring-zinc-900 ring-inset';

// Read per call, not once: the OS setting can change while the page is open.
const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

// bounce 0 for the same reason the viewer's morph uses it: a panel that overshoots its
// own height drags every beat below it along for the ride.
const PANEL_MOTION = { type: 'spring', bounce: 0, duration: 0.4 } as const;

// The row's contents, shared by the two things a row can be - a disclosure button or,
// for a beat with nothing behind it, a plain line. Phrasing content only: a <button>
// may not hold a <div>, so every box here is a span made to behave like one.
function BeatHeading({
  title,
  role,
  summary,
  expandable,
  isOpen,
}: Pick<BeatProps, 'title' | 'role' | 'summary'> & { expandable: boolean; isOpen: boolean }) {
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-foreground text-sm font-medium tracking-normal">{title}</span>
          {role && <span className={cn(CHIP, toneFor(role))}>{role}</span>}
        </span>
        {summary && (
          <span className="text-muted-foreground mt-1 block text-[13px] leading-relaxed tracking-wide">
            {summary}
          </span>
        )}
      </span>
      {expandable && (
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={16}
          strokeWidth={2}
          className={cn(
            'text-muted-foreground/40 mt-1 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      )}
    </>
  );
}

/**
 * A landing page read as a sequence of beats: what each one is for, why it earns its
 * position, and what sits inside it. The spine carries the order and each beat's job;
 * opening a beat gives its own crop of the page and the ordering of the information
 * within it, so the same analysis works at both scales.
 *
 * ```mdx
 * <InfoArchitecture>
 *   <Beat title="Hero" role="價值" from={0} to={745} summary="它是什麼、能做到什麼">
 *     <Info label="一句話定位">先框住類別，再談差異</Info>
 *   </Beat>
 * </InfoArchitecture>
 * ```
 *
 * Crops are cut from the post's own full-page screenshot by row range, so a teardown
 * never carries a second set of image assets that can drift out of sync with the one
 * the annotations viewer is already showing.
 */
export function InfoArchitecture({
  image,
  imageAlt,
  imageWidth,
  imageHeight,
  children,
}: InfoArchitectureProps) {
  const beats = useMemo(() => Children.toArray(children).filter(isBeat), [children]);

  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set());
  // Opening is one-way as far as the images go: a beat that has been opened keeps its
  // crop mounted. Thirteen slices of one 1440x10233 screenshot decoded up front is a
  // cost no reader has asked for yet.
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set());
  const [hovered, setHovered] = useState<number | null>(null);
  const baseId = useId();

  const railRef = useRef<HTMLDivElement | null>(null);
  const bandRefs = useRef<(HTMLElement | null)[]>([]);
  const rowRefs = useRef<(HTMLElement | null)[]>([]);

  const bands = beats.map(({ props }) =>
    typeof props.from === 'number' && typeof props.to === 'number' && props.to > props.from
      ? { from: props.from, span: props.to - props.from }
      : null
  );
  const hasRail = Boolean(image && imageWidth && imageHeight) && bands.some(Boolean);
  const firstBand = bands.findIndex(Boolean);
  const lastBand = bands.reduce((last, band, index) => (band ? index : last), -1);

  // Pans the rail's own scroll box rather than calling scrollIntoView, which would drag
  // the page along with it and move the row the reader just clicked.
  const panRailTo = (index: number) => {
    const rail = railRef.current;
    const band = bandRefs.current[index];
    if (!rail || !band) return;
    rail.scrollTo({
      top: band.offsetTop - (rail.clientHeight - band.offsetHeight) / 2,
      behavior: scrollBehavior(),
    });
  };

  const toggle = (index: number) => {
    const opening = !open.has(index);
    setOpen((previous) => {
      const next = new Set(previous);
      if (opening) next.add(index);
      else next.delete(index);
      return next;
    });
    setSeen((previous) => (previous.has(index) ? previous : new Set(previous).add(index)));
    if (opening) panRailTo(index);
  };

  // The rail's half of the pairing: a band opens its beat and brings the row to the
  // reader, the mirror of a row opening panning the rail.
  const jumpToBeat = (index: number) => {
    if (!open.has(index)) toggle(index);
    rowRefs.current[index]?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
  };

  return (
    <MotionConfig reducedMotion="user">
      {/* Wider than the prose measure: the rail and the list sit side by side. The rail
          takes the larger share of it, because the page it shows is the evidence and the
          rows are notes about it - a list of one-line labels does not need 700px. */}
      <div className="mx-auto w-full max-w-5xl">
        <div
          className={cn(hasRail && 'lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-6')}
        >
          {hasRail && (
            // Hidden below lg, where a 1:7 page in a full-width column would be a
            // 2000px-tall scroll of its own. There each beat's panel carries its crop.
            // self-start is what lets a grid item stick: stretched to the row's height it
            // would have nowhere to travel.
            <aside className="max-lg:hidden lg:sticky lg:top-8 lg:h-[calc(100svh-6rem)] lg:self-start">
              <div
                ref={railRef}
                className="border-border/80 bg-muted h-full overflow-y-auto overscroll-contain rounded-xl border"
              >
                {/* The mat is what keeps a band's frame off the rail's rounded corners:
                    the scroll box clips to its radius, so a square frame drawn hard against
                    the corner loses two of its sides. 8px clears a 12px radius.
                    The inner wrapper takes its height from the image, so a band can state
                    its position as a share of the whole page and need no measuring. */}
                <div className="p-2">
                  <div className="relative">
                    <img
                      src={`${image}.webp`}
                      srcSet={`${image}-800.webp 800w, ${image}.webp 1440w, ${image}-2048.webp 2048w`}
                      sizes="26rem"
                      alt={imageAlt ?? ''}
                      width={imageWidth}
                      height={imageHeight}
                      className="block h-auto w-full rounded-lg"
                    />
                    {bands.map((band, index) =>
                      band === null ? null : (
                        <button
                          key={index}
                          ref={(element) => {
                            bandRefs.current[index] = element;
                          }}
                          type="button"
                          // A duplicate of the row's own disclosure: reachable by pointer,
                          // but not a second tab stop announcing the same thing twice.
                          tabIndex={-1}
                          aria-hidden="true"
                          onClick={() => jumpToBeat(index)}
                          onMouseEnter={() => setHovered(index)}
                          onMouseLeave={() => setHovered(null)}
                          style={{
                            top: `${(band.from / imageHeight!) * 100}%`,
                            height: `${(band.span / imageHeight!) * 100}%`,
                          }}
                          className={cn(
                            RAIL_BAND,
                            // The end bands carry the screenshot's own corner radius, so a
                            // frame at either end curves with the image instead of squaring
                            // off across it. Nothing clips them - the radius is on the image,
                            // not on a box around it.
                            index === firstBand && 'rounded-t-lg',
                            index === lastBand && 'rounded-b-lg',
                            open.has(index) || hovered === index
                              ? RAIL_BAND_ACTIVE
                              : 'hover:bg-zinc-900/5'
                          )}
                        >
                          <span
                            className={cn(
                              RAIL_BADGE,
                              open.has(index) || hovered === index ? 'opacity-100' : 'opacity-0'
                            )}
                          >
                            {index + 1}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* space-y, not gap on the rows themselves: two open beats are two cards, and
              cards that share an edge read as one. */}
          <ol className="relative space-y-2">
            {/* The spine, behind the nodes: the list's subject is an order, and a line
              through the numbers is what says so before a word is read.
              A 24px node centres on an integer, so a 1px line can only sit on that
              centre by straddling it - hence the translate rather than a left of 12px,
              which would leave the line half a pixel to the right of every number. */}
            <span
              aria-hidden="true"
              className="bg-border absolute top-4 bottom-4 left-3 w-px -translate-x-1/2"
            />

            {beats.map((beat, index) => {
              const { title, role, summary, from, to, children: body } = beat.props;
              const infos = Children.toArray(body).filter(isInfo);
              const prose = Children.toArray(body).filter((node) => !isInfo(node));
              const span = typeof from === 'number' && typeof to === 'number' ? to - from : null;
              const crop =
                span !== null && span > 0 && image && imageWidth && imageHeight
                  ? { from: from!, span }
                  : null;
              const expandable = infos.length > 0 || prose.length > 0 || crop !== null;
              const isOpen = expandable && open.has(index);
              const isHovered = hovered === index;
              const headerId = `${baseId}-b${index}`;
              const panelId = `${baseId}-p${index}`;

              return (
                <li key={index}>
                  <div className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        NODE,
                        isOpen
                          ? 'border-primary bg-primary text-primary-foreground'
                          : cn(
                              'bg-background text-muted-foreground/70',
                              isHovered
                                ? 'border-muted-foreground/40 bg-foreground text-background'
                                : 'border-border'
                            )
                      )}
                    >
                      <span className="translate-x-[0.5px] translate-y-[0.5px] font-semibold">
                        {index + 1}
                      </span>
                    </span>

                    <div className={cn(SHELL, 'min-w-0 flex-1', isOpen && SHELL_OPEN)}>
                      {/* A beat with nothing behind it gets no button and no chevron: an
                        affordance the row cannot honour is worse than no affordance. */}
                      {expandable ? (
                        <button
                          ref={(element) => {
                            rowRefs.current[index] = element;
                          }}
                          type="button"
                          id={headerId}
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => toggle(index)}
                          onMouseEnter={() => setHovered(index)}
                          onMouseLeave={() => setHovered(null)}
                          className={cn(HEADER, 'cursor-pointer', !isOpen && 'hover:bg-muted/60')}
                        >
                          <BeatHeading
                            title={title}
                            role={role}
                            summary={summary}
                            expandable
                            isOpen={isOpen}
                          />
                        </button>
                      ) : (
                        <div
                          ref={(element) => {
                            rowRefs.current[index] = element;
                          }}
                          id={headerId}
                          className={HEADER}
                        >
                          <BeatHeading
                            title={title}
                            role={role}
                            summary={summary}
                            expandable={false}
                            isOpen={false}
                          />
                        </div>
                      )}

                      {expandable && (
                        <motion.div
                          id={panelId}
                          role="region"
                          aria-labelledby={headerId}
                          // inert rather than hidden: the panel stays in the flow so its
                          // height can animate, and a collapsed one must still be
                          // unreachable by tab and by a find-in-page hit.
                          inert={!isOpen}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                          transition={PANEL_MOTION}
                          className="overflow-hidden"
                        >
                          <div
                            className={cn(
                              'grid gap-4 px-3 pt-1 pb-4',
                              // A share of the panel rather than a fixed width: the rail
                              // already takes 20rem off the top, so a panel at 1024px is
                              // half the width of one at 1440 and a fixed crop column would
                              // squeeze the notes to nothing there.
                              crop && 'sm:grid-cols-[minmax(0,45%)_minmax(0,1fr)] sm:gap-5'
                            )}
                          >
                            {/* The closing note travels with the crop rather than closing the
                              list: it is an observation about the whole section, and the
                              left column would otherwise run out well above the right one
                              and leave the panel half empty. */}
                            {crop && (
                              <div>
                                {seen.has(index) && (
                                  <div
                                    className="border-border/80 bg-muted relative overflow-hidden rounded-lg border"
                                    style={{ aspectRatio: `${imageWidth} / ${crop.span}` }}
                                  >
                                    {/* The window is the box; the screenshot slides behind
                                        it. top is a share of the box's own height, so the
                                        slice holds at every width without a measure. */}
                                    <img
                                      src={`${image}.webp`}
                                      srcSet={`${image}-800.webp 800w, ${image}.webp 1440w, ${image}-2048.webp 2048w`}
                                      sizes="(min-width: 64rem) 15rem, (min-width: 40rem) 45vw, 100vw"
                                      alt={`${title} 區塊截圖`}
                                      width={imageWidth}
                                      height={imageHeight}
                                      loading="lazy"
                                      decoding="async"
                                      className="absolute left-0 w-full max-w-none"
                                      style={{ top: `${(-crop.from / crop.span) * 100}%` }}
                                    />
                                  </div>
                                )}
                                {prose.length > 0 && (
                                  <div className={cn(NOTE, 'mt-3')}>{prose}</div>
                                )}
                              </div>
                            )}

                            <div>
                              {infos.length > 0 && (
                                <>
                                  <ol className="mt-2 space-y-2">
                                    {infos.map((info, order) => (
                                      <li
                                        key={order}
                                        className="flex items-baseline gap-2 text-[13px] leading-relaxed"
                                      >
                                        <span className="text-muted-foreground/40 w-3 shrink-0 text-right text-[11px] tabular-nums">
                                          {order + 1}
                                        </span>
                                        <span className="min-w-0">
                                          <span className="text-foreground block font-medium tracking-normal">
                                            {info.props.label}
                                          </span>
                                          {info.props.children && (
                                            <span className="text-muted-foreground block tracking-wide">
                                              {info.props.children}
                                            </span>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ol>
                                </>
                              )}

                              {/* Without a crop there is no left column to carry the note, so
                                it closes the list - ruled off, or it reads as one more
                                unnumbered item in it. */}
                              {!crop && prose.length > 0 && (
                                <div
                                  className={cn(
                                    NOTE,
                                    infos.length > 0 && 'border-border/70 mt-3 border-t pt-3'
                                  )}
                                >
                                  {prose}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </MotionConfig>
  );
}
