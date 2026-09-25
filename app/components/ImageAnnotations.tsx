import {
  ArrowDown01Icon,
  ArrowExpandIcon,
  ArrowUp01Icon,
  Cancel01Icon,
  Image02Icon,
  Menu11Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { MotionConfig, animate, motion } from 'motion/react';
import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '~/lib/utils';

// The design dimensions a note can be about. A closed vocabulary with its colours
// declared once: 豐富 has to be the same violet in every note of every post, or the
// colour stops carrying meaning and becomes decoration.
const TAG_TONES = {
  區隔: 'bg-green-100 text-green-800',
  豐富: 'bg-violet-100 text-violet-800',
} as const;

export type AnnotationTag = keyof typeof TAG_TONES;

interface AnnotationProps {
  /** Image-space coordinates in the source image's pixel system (e.g. 1440-wide). */
  x?: number;
  y: number;
  /**
   * Give the note a size and it frames a region instead of pointing at one spot.
   * `to` is the bottom edge, an alternative to `h`; omit `x`/`w` and the region spans
   * the image's full width, which is what a page section is.
   */
  w?: number;
  h?: number;
  to?: number;
  /** Names the region in the side list. A dot rarely needs one; a section always does. */
  title?: string;
  /** One dimension, or several: `tags="區隔"` / `tags={['區隔', '豐富']}`. */
  tags?: AnnotationTag | AnnotationTag[];
  /** Optional anchor for deep links (#id). */
  id?: string;
  children?: ReactNode;
}

// A marker element: <ImageAnnotations> reads its props and renders both the dot and
// the card itself. Rendering plain children keeps a stray usage outside the wrapper
// from disappearing silently.
export function Annotation({ children }: AnnotationProps) {
  return <div>{children}</div>;
}

interface SourceProps {
  /** Extensionless path — `.webp` / `-800.webp` variants follow the site convention. */
  image: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
}

type Note = ReactElement<AnnotationProps>;

/**
 * `page` — the whole image sits in the page flow at full fidelity; each dot owns
 * its own note, revealed on hover and kept open on click.
 * `cursor` — a sticky stage where scroll pans the image through a fixed pane
 * and a side list lights up card by card as dots come into view.
 */
type AnnotationsView = 'page' | 'cursor';

/**
 * How the viewer occupies the page. `inline` puts it in the article's flow, where
 * it shares the page's scroll with the prose around it. `fullscreen` shows a
 * clipped preview instead and moves the whole viewer into an overlay that owns
 * its own scroll — the author's call, not the reader's, so a post that needs the
 * room asks for it and one that doesn't never grows a modal.
 */
export type AnnotationsMode = 'inline' | 'fullscreen';

/**
 * The scroll a view reads and drives. Inline that is the page; in the overlay it is
 * the overlay's own box. Everything is stated in client coordinates — the same
 * currency `getBoundingClientRect` speaks — so each view's geometry is written once
 * and holds in both.
 */
interface ScrollPort {
  scrollTop: () => number;
  scrollTo: (top: number, behavior: ScrollBehavior) => void;
  /** The port's window onto its content, in client coordinates. */
  viewport: () => { top: number; height: number };
  subscribe: (listener: () => void) => () => void;
}

const WINDOW_PORT: ScrollPort = {
  scrollTop: () => window.scrollY,
  scrollTo: (top, behavior) => window.scrollTo({ top, behavior }),
  viewport: () => ({ top: 0, height: window.innerHeight }),
  subscribe: (listener) => {
    window.addEventListener('scroll', listener, { passive: true });
    return () => window.removeEventListener('scroll', listener);
  },
};

const elementPort = (element: HTMLElement): ScrollPort => ({
  scrollTop: () => element.scrollTop,
  scrollTo: (top, behavior) => element.scrollTo({ top, behavior }),
  viewport: () => ({ top: element.getBoundingClientRect().top, height: element.clientHeight }),
  subscribe: (listener) => {
    element.addEventListener('scroll', listener, { passive: true });
    return () => element.removeEventListener('scroll', listener);
  },
});

const ScrollPortContext = createContext<ScrollPort>(WINDOW_PORT);

/**
 * The overlay's reserved chrome row. A view portals its toggle in rather than
 * positioning it itself: the row lives outside the scroll box, which is the only
 * place a control can sit without content passing under it. Null inline, where the
 * viewer has no chrome row and each view places its own rail.
 */
const ChromeSlotContext = createContext<HTMLElement | null>(null);

/** Viewport boxes of the travelling elements at the moment of a switch. */
interface HandoffBoxes {
  shot: DOMRect | null;
  rail: DOMRect | null;
  marks: DOMRect[];
}

/** What the outgoing view reports and the incoming view restores and animates from. */
interface Handoff {
  /** The image row (0–1) the reader was centred on. */
  progress: number | null;
  /**
   * The section's top relative to the port's own top edge at the click. At or below that
   * edge (>= 0) the reader was at the start, with whatever sits above the viewer still on
   * screen — the incoming view then holds this offset instead of re-centering the reading
   * row, so nothing above the component scrolls away under the click.
   *
   * Zero counts, and has to: flush with the port's top edge is the commonest way to be at
   * the start. Excluded, that one position fell through to the centering path, which puts
   * the row that *was* centered in the middle of the incoming view — from the top of the
   * page view, half a viewport into the image rather than at row zero.
   */
  anchorTop: number | null;
  boxes: HandoffBoxes | null;
}

interface ViewProps extends SourceProps {
  notes: Note[];
  presentation: AnnotationsMode;
  /** Set when arriving from the other view; null on first mount. */
  handoff: Handoff | null;
  onSelect: (view: AnnotationsView, handoff: Handoff) => void;
  /** Both undefined when the post has only one kind of mark. */
  layer?: AnnotationLayer;
  onSelectLayer?: (layer: AnnotationLayer) => void;
}

export interface ImageAnnotationsProps extends SourceProps {
  /** Where the viewer lives; the reader cannot change it. */
  mode?: AnnotationsMode;
  /** Which view the post opens in; the reader can switch from there. */
  defaultView?: AnnotationsView;
  children?: ReactNode;
}

// The dot's label and the card's number are the same token, so the pairing is
// legible at a glance rather than being two numbers that happen to match.
const PAIR_BADGE =
  'rounded-[5px] bg-blue-500 px-[5px] py-0.5 text-[10px] leading-4 font-medium text-white tabular-nums';

// The same one-line box and radius as PAIR_BADGE, so the number and its tags read as one
// row rather than as chips of two different systems. A point larger and roomier: two
// digits still read at the badge's 10px, CJK at that size is a smudge. The tint stays
// pale against the badge's solid blue — the number identifies, the tag only classifies.
const TAG = 'rounded-[5px] px-1.5 text-xs leading-5 font-medium';

// The dot's look alone, so the preview can show the same marks without also
// inheriting an affordance it doesn't honour.
const DOT_FACE = 'border-background block size-4 rounded-full border-2 bg-blue-500 shadow-md';

/**
 * A note's mark in image space. A dot is a region with no size, which is the whole point
 * of stating it this way: placement, the in-view test, the tether's anchor and the
 * cross-view travel are each written once and hold for both.
 */
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const noteRect = ({ props }: Note, imageWidth: number): Rect => {
  const h = props.h ?? (props.to === undefined ? 0 : props.to - props.y);
  // A band states only the rows it covers; spanning the full width is what makes it one.
  const w = props.w ?? (h > 0 ? imageWidth - (props.x ?? 0) : 0);
  return { x: props.x ?? 0, y: props.y, w: Math.max(w, 0), h: Math.max(h, 0) };
};

const isRegion = (rect: Rect) => rect.w > 0 && rect.h > 0;

/**
 * The corner radii a band at either end of the image has to carry. The screenshot's own
 * corners are rounded — by a clipping pane, or by the image's radius in the page view —
 * and a frame drawn square across that curve either sticks out past it or, inside a
 * clipping box, loses the two sides that pass through the corner. Bands in the middle
 * stay square: their edges are interior, and there is no curve to follow.
 *
 * The radii come in as whole class names, spelled out at each call site: they have to
 * trace exactly the arc of the box around them, and Tailwind only compiles the classes it
 * can read in the source — an interpolated `rounded-t-${size}` would never exist.
 */
const bandCorners = (rects: Rect[], index: number, top: string, bottom: string) => {
  const first = rects.findIndex((rect) => isRegion(rect));
  const last = rects.reduce((found, rect, i) => (isRegion(rect) ? i : found), -1);
  return cn(index === first && top, index === last && bottom);
};

// The region's face: the dots' blue, drawn as a frame. ring rather than border, so the
// box stays exactly the rows it names - a border would grow it by 2px and put every
// percentage inside it half a pixel out.
// Square corners: bands sit edge to edge, and a radius on both sides of a shared
// boundary pinches it into a notch. Only the two at the ends of the image get a radius,
// and it comes from whatever is clipping them - see bandCorners.
const REGION_FACE = 'block size-full ring-2 ring-blue-500 ring-inset';

const REGION = `${REGION_FACE} group focus-visible:ring-ring cursor-pointer bg-blue-500/0 transition-colors hover:bg-blue-500/10 focus-visible:ring-2`;

// The [data-dot] wrapper owns the dot's position and cross-view travel (flipFrom
// writes its transform); the button keeps only its own look and hover scale, so
// the two kinds of movement never share an element.
const DOT = `${DOT_FACE} group focus-visible:ring-ring cursor-pointer transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:outline-hidden`;

const CARD =
  'bg-background border-border rounded-xl border-2 p-4 py-3 pt-2.5 shadow-xs transition-[opacity,border-color,box-shadow] duration-300';

// What a note is written in: a numbered list of a section's parts, with the phrase that
// names each part marked. Both shapes come from the shared MDX utilities, so a note reads
// the same here, in the floating card, and in the info-architecture rail.
const NOTE_MARKUP = 'mdx-lists mdx-mark';

const NOTE_TEXT = cn(
  'text-muted-foreground space-y-3 text-sm leading-[1.5] tracking-wide',
  NOTE_MARKUP
);

// The floating note is a glance surface, not a reading column: it competes with the
// screenshot it covers, so it buys back every pixel it can — tighter padding, closer
// leading, no extra tracking, a hairline border instead of the list card's two. The
// side list keeps CARD, where the reader is settling in rather than peeking.
const FLOATING_NOTE =
  'bg-background border-border rounded-lg border px-3 py-2.5 shadow-lg transition-[opacity,scale]';

// tracking-normal is a reset, not a choice: the article's prose wrapper sets
// tracking-wide, and inheriting it here would undo the tightening.
const FLOATING_NOTE_TEXT = cn(
  'text-zinc-500 space-y-2 text-[13px] tracking-normal font-[450]',
  NOTE_MARKUP
);

// A note floats beside its dot. Below md the image is narrower than a readable
// card, so the note docks to the bottom of the viewport instead of trying to fit
// in the leftover strip — where it would also push the page into sideways scroll.
const CARD_ANCHOR =
  'absolute z-10 -translate-y-4 max-md:fixed max-md:top-auto max-md:right-4 max-md:bottom-4 max-md:left-4 max-md:translate-y-0 max-md:p-0';

const VIEW_META: Record<AnnotationsView, { label: string; icon: IconSvgElement }> = {
  page: { label: '整頁檢視', icon: Image02Icon },
  cursor: { label: '逐則檢視', icon: Menu11Icon },
};

/**
 * Which kind of mark the viewer is showing. The two are not variations of one thing:
 * regions are about where the page's argument is divided, dots about how a detail is
 * made, and drawing a dozen frames under eighteen dots would leave neither readable.
 * One at a time, and each layer numbers from 01 - the numbers belong to the reading,
 * not to a combined roster the reader never sees whole.
 */
type AnnotationLayer = 'region' | 'point';

// Words, not glyphs. The view switch can afford icons because its two options are a
// picture and a list, which draw themselves; these two are subject matter, and no icon
// says "資訊架構" rather than "介面設計" without the reader first being told which is which.
const LAYER_META: Record<AnnotationLayer, string> = {
  region: '資訊架構',
  point: '介面設計',
};

const layerOf = (note: Note, imageWidth: number): AnnotationLayer =>
  isRegion(noteRect(note, imageWidth)) ? 'region' : 'point';

// Which layer a viewer opens on: structure first when the post has any, because it is the
// frame the details sit inside. Shared, so the preview and the viewer behind it cannot
// disagree about which layer the reader is being shown.
const openingLayer = (notes: Note[], imageWidth: number): AnnotationLayer =>
  notes.some((note) => layerOf(note, imageWidth) === 'region') ? 'region' : 'point';

// Both rail controls share one body: a slab split by a seam rather than loose
// buttons stacked up, so a pair of options reads as one switch and the rail reads as
// one instrument. overflow-hidden lets the body's radius clip each cell, so no cell
// restates the corner geometry — which is also why the focus ring has to be inset.
//
// The `min-[95rem]` gate repeated at every inline rail placement below is the width at
// which this body fits *beside* the viewer. The article is `max-w-360 px-6`, so its box
// stops 24px from the viewport edge once past 90rem, while the rail needs 50px out there
// (12px gap + 38px body); room grows at half the viewport's rate, making
// 90rem + 2×(50 − 24) = 94.25rem the exact floor, and 95rem leaves slack. It is spelled
// out at each use because Tailwind only compiles class names it can read in the source.
// The overlay never uses it: there the rail sits in the screen's own corner.
const RAIL_BODY =
  'border-border divide-border bg-background flex overflow-hidden rounded-md border shadow-xs';

// Inline the rail stands beside a tall image, so it stacks; in the overlay it lies in
// the top corner of the screen, where a row is what reads as a title bar's controls.
const RAIL_COLUMN = 'flex-col divide-y';
const RAIL_ROW = 'flex-row divide-x';

const RAIL_CELL =
  'focus-visible:ring-ring flex h-9 cursor-pointer items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-hidden';

// A glyph is a known size, so its cell can be square.
const RAIL_CELL_ICON = 'w-9';

// The layer switch is not one of these. It picks the post's subject, not a way of looking
// at it, and giving it the same slab would file it as a third pair of view options. Two
// words and a slash, weight and colour carrying the state.
const LAYER_CELL = 'cursor-pointer whitespace-nowrap transition-colors';
const LAYER_CELL_ON = 'text-foreground font-medium';
const LAYER_CELL_OFF = 'text-muted-foreground/50 hover:text-muted-foreground font-normal';

const RAIL_CELL_IDLE = 'text-muted-foreground/50 hover:bg-muted/50 hover:text-foreground';

// The step cells run out at both ends of the track, so they carry a spent state the
// toggle has no use for. aria-disabled rather than the real thing: the pan can spend a
// cell while the reader's focus is on it, and `disabled` would drop that focus to the
// body mid-scroll. The handler already no-ops when there is nowhere to step.
const RAIL_CELL_STEP =
  'text-muted-foreground/50 not-aria-disabled:hover:bg-muted/50 not-aria-disabled:hover:text-foreground aria-disabled:text-muted-foreground/20 aria-disabled:cursor-default';

// Shaded and shadowed inwards: the selected half sits below the other one, the way
// the flipped side of a rocker switch does.
const RAIL_CELL_PRESSED = 'bg-muted text-foreground inset-shadow-sm';

// Closing the overlay is not one of a set, so it carries no slab: a second body
// beside the toggle's would read as a third view to choose from. Ghost, on the
// chrome row's own background, and its focus ring sits outside rather than inset
// because no clipped corner is forcing it in.
const CHROME_GHOST =
  'text-muted-foreground/60 hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-9 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-hidden';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// Read per call, not once: the OS setting can change while the page is open.
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');

// Every element that travels in a view switch shares this transition: the dots sit
// glued to the morphing image mid-flight only while their easing matches its exactly.
const MORPH = { type: 'spring', bounce: 0, duration: 0.5 } as const;

// The number's arrival, in Motion's recommended spring terms — visualDuration is
// when the label is *at* size, bounce is how far past it goes on the way. Stated
// this way the stagger stays legible no matter how bouncy the spring gets, which
// stiffness/damping can't promise.
const BADGE_REVEAL = { type: 'spring', visualDuration: 0.25, bounce: 0.5 } as const;

// One-shot flash so a jump visibly points out the card in the list. Re-flashing
// mid-flash restarts the animation: drop the attribute, force a reflow so the browser
// forgets the previous run, then set it again.
const flashCard = (card: HTMLElement | null | undefined) => {
  if (!card) return;
  delete card.dataset.flash;
  void card.offsetWidth;
  card.dataset.flash = '';
};

// Percentages of the image, so a mark holds its place at every rendered width without
// being measured. Centering via calc rather than a translate — see DOT.
const markPosition = (rect: Rect, imageWidth: number, imageHeight: number) =>
  isRegion(rect)
    ? {
        left: `${(rect.x / imageWidth) * 100}%`,
        top: `${(rect.y / imageHeight) * 100}%`,
        width: `${(rect.w / imageWidth) * 100}%`,
        height: `${(rect.h / imageHeight) * 100}%`,
      }
    : {
        left: `calc(${(rect.x / imageWidth) * 100}% - 0.5rem)`,
        top: `calc(${(rect.y / imageHeight) * 100}% - 0.5rem)`,
      };

// The cursor view mounts the rail at two anchors and lets the breakpoint pick one
// (see there); a display:none element measures 0×0, so the one with a real box is the
// one on screen. Both the capture and the replay have to agree on which that is.
const laidOutRail = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('[data-view-rail]')).find(
    (el) => el.getBoundingClientRect().width > 0
  ) ?? null;

const captureBoxes = (root: HTMLElement | null): HandoffBoxes | null =>
  root === null
    ? null
    : {
        shot: root.querySelector('img')?.getBoundingClientRect() ?? null,
        rail: laidOutRail(root)?.getBoundingClientRect() ?? null,
        marks: Array.from(root.querySelectorAll('[data-mark]'), (el) => el.getBoundingClientRect()),
      };

// Manual FLIP instead of layoutId: Motion anchors shared-element snapshots to the
// document, and a switch moves scroll by thousands of px, which sends every
// traveller flying by that amount. Boxes captured at click time and replayed here
// are viewport-relative, so the scroll handoff can't leak into the animation.
// Runs pre-paint; animate()'s first frame lands in the same rendering frame.
const flipFrom = (root: HTMLElement | null, boxes: HandoffBoxes | null) => {
  if (!root || !boxes) return [];
  if (prefersReducedMotion()) return [];

  const travellers: ReturnType<typeof animate>[] = [];
  const travel = (el: Element | null, from: DOMRect | null, scales: boolean) => {
    if (!el || !from) return;
    const to = el.getBoundingClientRect();
    if (!to.width || !to.height) return;
    (el as HTMLElement).style.transformOrigin = '0 0';
    travellers.push(
      animate(
        el,
        {
          x: [from.x - to.x, 0],
          y: [from.y - to.y, 0],
          ...(scales
            ? { scaleX: [from.width / to.width, 1], scaleY: [from.height / to.height, 1] }
            : {}),
        },
        MORPH
      )
    );
  };

  travel(root.querySelector('img'), boxes.shot, true);
  travel(laidOutRail(root), boxes.rail, false);
  // A dot is 16px in either view and only moves; a region is a slice of the image and
  // changes size with it, so it has to scale or it would arrive framing the wrong rows.
  Array.from(root.querySelectorAll<HTMLElement>('[data-mark]')).forEach((el, i) =>
    travel(el, boxes.marks[i] ?? null, 'region' in el.dataset)
  );
  return travellers;
};

const collectNotes = (children: ReactNode) =>
  Children.toArray(children).filter(
    (child): child is Note => isValidElement(child) && child.type === Annotation
  );

export function ImageAnnotations({
  mode = 'inline',
  defaultView = 'page',
  children,
  ...source
}: ImageAnnotationsProps) {
  const notes = collectNotes(children);

  return mode === 'fullscreen' ? (
    <FullscreenAnnotations notes={notes} defaultView={defaultView} {...source} />
  ) : (
    <AnnotationsViewer notes={notes} presentation="inline" defaultView={defaultView} {...source} />
  );
}

function AnnotationsViewer({
  notes,
  presentation,
  defaultView,
  ...source
}: SourceProps & {
  notes: Note[];
  presentation: AnnotationsMode;
  defaultView: AnnotationsView;
}) {
  // The outgoing view reports the image row the reader was looking at and the
  // incoming one restores it: on a 10,000px screenshot, landing back at the top
  // would cost more than the switch is worth. One state object, because the view
  // and the place it has to restore must land in the same render.
  const [mode, setMode] = useState<{ view: AnnotationsView; handoff: Handoff | null }>({
    view: defaultView,
    handoff: null,
  });

  // Split by shape, not by a prop the author has to remember to set: a note that names
  // rows is structural, a note that names a point is a detail.
  const layers = useMemo(() => {
    const region: Note[] = [];
    const point: Note[] = [];
    for (const note of notes) {
      (isRegion(noteRect(note, source.imageWidth)) ? region : point).push(note);
    }
    return { region, point };
  }, [notes, source.imageWidth]);

  const both = layers.region.length > 0 && layers.point.length > 0;
  const [layer, setLayer] = useState<AnnotationLayer>(() => openingLayer(notes, source.imageWidth));
  const shown = both ? layers[layer] : notes;

  /**
   * A layer switch spends the pending handoff without using it. The handoff is a one-shot
   * payload from a *view* switch — the boxes the outgoing view's elements occupied — and
   * holding it in state means any later remount replays it. A layer switch is such a
   * remount, so without this the image would morph from boxes measured in the other view,
   * at the other view's width: it jumps to that size and animates back down.
   *
   * Batched with setLayer, so the remount happens with the handoff already gone.
   */
  const selectLayer = (next: AnnotationLayer) => {
    setLayer(next);
    setMode((current) => (current.handoff === null ? current : { ...current, handoff: null }));
  };

  const viewProps = {
    ...source,
    notes: shown,
    presentation,
    handoff: mode.handoff,
    onSelect: (view: AnnotationsView, handoff: Handoff) =>
      setMode((current) => (current.view === view ? current : { view, handoff })),
    ...(both ? { layer, onSelectLayer: selectLayer } : {}),
  };

  // Keyed by layer: switching it replaces every mark on the image, so the view starts
  // clean rather than reconciling one roster of refs and per-note geometry into another.
  // Scroll is untouched, and the pan derives from it, so the reader stays on the same
  // image row across the switch.
  //
  // reducedMotion turns the fades into plain swaps for readers who asked the OS
  // for less motion; flipFrom checks the same preference itself.
  return (
    <MotionConfig reducedMotion="user">
      {mode.view === 'cursor' ? (
        <CursorView key={layer} {...viewProps} />
      ) : (
        <PageView key={layer} {...viewProps} />
      )}
    </MotionConfig>
  );
}

/**
 * Fullscreen mode: the article carries only a clipped preview, and the viewer
 * proper lives in an overlay. The preview is deliberately inert — a reader who
 * wants to work with a note is a reader who wants the room, so the only thing to
 * do here is take it.
 */
function FullscreenAnnotations({
  notes,
  defaultView,
  ...source
}: SourceProps & { notes: Note[]; defaultView: AnnotationsView }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <CollapsedPreview onOpen={() => setOpen(true)} {...source} />
      {open && (
        <FullscreenOverlay onClose={close} label={source.imageAlt}>
          <AnnotationsViewer
            notes={notes}
            presentation="fullscreen"
            defaultView={defaultView}
            {...source}
          />
        </FullscreenOverlay>
      )}
    </>
  );
}

// Enough of the screenshot to show what kind of page it is, and not so much that
// scrolling past it becomes the reader's problem.
const PREVIEW_HEIGHT = 'h-[40svh]';

function CollapsedPreview({ onOpen, ...source }: SourceProps & { onOpen: () => void }) {
  return (
    <div
      className={cn(
        'border-border/80 relative mx-auto max-w-3xl overflow-hidden rounded-xl border',
        PREVIEW_HEIGHT
      )}
    >
      {/* Unmarked on purpose. The preview's job is to say what kind of page this is and
          that there is more of it; the marks are the reading itself, and a dozen frames
          drawn across a clipped strip only make the strip harder to see. */}
      <Screenshot {...source} sizes="(min-width: 52rem) 48rem, 100vw" className="w-full" />

      {/* The cut has to read as "there is more", not as the bottom of the image, so
          the last stretch dissolves into the page instead of ending on a hard edge.
          The stops are placed rather than left to spread evenly: the bottom third of
          the band reaches the page colour outright, which both gives the button a
          clean bed and keeps a dark screenshot from showing through as grey haze. */}
      <div
        aria-hidden="true"
        className="from-background via-background/85 absolute inset-x-0 bottom-0 h-[45%] bg-linear-to-t from-35% via-60% to-transparent"
      />

      <button
        type="button"
        onClick={onOpen}
        className="bg-primary text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-background absolute bottom-6 left-1/2 flex -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full py-2.5 pr-5 pl-4 text-sm font-medium tracking-wide shadow-lg transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
      >
        <HugeiconsIcon icon={ArrowExpandIcon} className="size-[18px]" />
        全螢幕檢視
      </button>
    </div>
  );
}

/**
 * The viewer's own room. It scrolls itself — the reader hitting either end stays
 * here rather than being handed back to the article mid-read — and the page behind
 * is locked and inert for as long as it is open.
 */
function FullscreenOverlay({
  children,
  label,
  onClose,
}: {
  children: ReactNode;
  label: string;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // State rather than refs: the views read both of these on their first render or
  // layout effect, which run before these elements' own refs are attached. Rendering
  // the views on the render after the elements exist is what gets them there in time.
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [chromeSlot, setChromeSlot] = useState<HTMLElement | null>(null);
  const port = useMemo(
    () => (scrollElement === null ? WINDOW_PORT : elementPort(scrollElement)),
    [scrollElement]
  );

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // A pinned note is the layer above this one and takes the key first. It is
        // still in the DOM at this point even if its own handler already ran —
        // React has not re-rendered from inside the same event.
        if (panelRef.current?.querySelector('[data-pinned]')) return;
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button, [tabindex="0"]'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus();
    };
  }, [onClose]);

  const ready = scrollElement !== null && chromeSlot !== null;

  // Portalled to the body so no ancestor's transform or overflow can turn `fixed`
  // into something else — the views write transforms of their own during a switch.
  return createPortal(
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      // Stacked, the chrome row has the screenshot directly beneath it, so the overlay
      // reserves the row's height here - outside the scroll box, which then starts below
      // it and can never put content up there. As padding on the content itself the strip
      // scrolled away with it. 56px is the row's own box: 12px down, 38px tall, plus a
      // little. Side by side there is nothing to reserve: the row's left end is over the
      // card column, which stands off on its own, and a band here would only be empty
      // surface above the screenshot.
      className="bg-background fixed inset-0 z-50 pt-14 outline-hidden lg:pt-0"
    >
      {/* Full height, not a column under a reserved row: the viewer gets the whole
          screen and the chrome floats over it. A row of its own would cost the cursor
          view's pane 56px of image on every screen, forever, to keep a corner clear.
          overscroll-contain is the second lock: body overflow stops the page from
          scrolling under the pointer, this stops the chain from ever being offered. */}
      <div ref={setScrollElement} className="h-full overflow-y-auto overscroll-contain">
        {ready && (
          <ScrollPortContext.Provider value={port}>
            <ChromeSlotContext.Provider value={chromeSlot}>{children}</ChromeSlotContext.Provider>
          </ScrollPortContext.Provider>
        )}
      </div>

      {/* Outside the scroll box, so it holds the screen's corner in both views and
          stays put across a switch. What sits beneath it is each view's problem: the
          page view lets its screenshot pass under, the cursor view opens its card
          column below this line. */}
      <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
        {/* The view toggle belongs to whichever view is mounted — it is the view that
            knows what to hand over on a switch — so the view portals it in here. */}
        <div ref={setChromeSlot} className="flex items-center" />
        <button
          type="button"
          aria-label="關閉全螢幕檢視"
          title="關閉全螢幕檢視"
          onClick={onClose}
          className={CHROME_GHOST}
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-[18px]" />
        </button>
      </div>
    </motion.div>,
    document.body
  );
}

/**
 * A pair of switches: which layer is marked, and how it is read. Two slabs rather than
 * one four-cell body — they answer different questions, and a single seamed body would
 * claim they are four options of the same kind. The layer switch only appears on a post
 * whose screenshot carries both kinds of mark; with one kind there is nothing to switch.
 */
function ViewRail({
  current,
  onSelect,
  orientation,
  className,
  layer,
  onSelectLayer,
}: {
  current: AnnotationsView;
  onSelect: (view: AnnotationsView) => void;
  layer?: AnnotationLayer;
  onSelectLayer?: (layer: AnnotationLayer) => void;
  orientation: 'horizontal' | 'vertical';
  className?: string;
}) {
  const horizontal = orientation === 'horizontal';
  const slab = cn(RAIL_BODY, horizontal ? RAIL_ROW : RAIL_COLUMN);

  const cell = <T extends string>(
    value: T,
    active: T,
    label: string,
    select: (value: T) => void,
    shape: string,
    body: ReactNode
  ) => (
    <button
      key={value}
      type="button"
      aria-pressed={value === active}
      aria-label={label}
      title={label}
      onClick={() => select(value)}
      className={cn(
        RAIL_CELL,
        shape,
        // Hover is scoped to the unselected half so its lighter fill can't
        // override the selected one — both are bg utilities, and the variant wins.
        value === active ? RAIL_CELL_PRESSED : RAIL_CELL_IDLE
      )}
    >
      {body}
    </button>
  );

  return (
    // data-view-rail is on the wrapper, not on a slab: it is what travels across a view
    // switch, and both switches travel together as one instrument.
    //
    // The layer switch leads, immediately left of the view switch. A wider gap than the
    // slabs use between themselves is what keeps the two apart: one names what the post is
    // about, the other is a tool for reading it, and they should not read as one strip of
    // four options.
    <div
      data-view-rail=""
      className={cn(
        'flex',
        horizontal ? 'flex-row items-center gap-3.5' : 'flex-col items-start gap-2',
        className
      )}
    >
      {layer !== undefined && onSelectLayer !== undefined && (
        <div role="group" aria-label="標注種類" className="flex items-center gap-1.5 text-xs">
          {(['region', 'point'] as const).map((value, index) => (
            <Fragment key={value}>
              {index > 0 && (
                <span aria-hidden="true" className="text-muted-foreground/25">
                  /
                </span>
              )}
              <button
                type="button"
                aria-pressed={value === layer}
                onClick={() => onSelectLayer(value)}
                className={cn(LAYER_CELL, value === layer ? LAYER_CELL_ON : LAYER_CELL_OFF)}
              >
                {LAYER_META[value]}
              </button>
            </Fragment>
          ))}
        </div>
      )}

      <div role="group" aria-label="檢視模式" className={slab}>
        {(['page', 'cursor'] as const).map((view) =>
          cell(
            view,
            current,
            VIEW_META[view].label,
            onSelect,
            RAIL_CELL_ICON,
            <HugeiconsIcon icon={VIEW_META[view].icon} className="size-[18px]" />
          )
        )}
      </div>
    </div>
  );
}

function Screenshot({
  image,
  imageAlt,
  imageWidth,
  imageHeight,
  sizes,
  className,
}: SourceProps & { sizes: string; className: string }) {
  return (
    <img
      src={`${image}.webp`}
      // 2048 is the ceiling the format sets, not a choice: WebP tops out at 16383px
      // per side, and a full-page shot this tall passes it above roughly 2300 wide.
      srcSet={`${image}-800.webp 800w, ${image}.webp 1440w, ${image}-2048.webp 2048w`}
      sizes={sizes}
      width={imageWidth}
      height={imageHeight}
      alt={imageAlt}
      draggable={false}
      className={className}
    />
  );
}

function noteNumber(index: number) {
  return String(index + 1).padStart(2, '0');
}

// The note's identity row, shared by both views so the pairing token and the tags can
// never drift apart between them. The margin below it belongs to the surface the row
// sits on, not to the row.
function NoteMeta({
  index,
  tags,
  className,
}: {
  index: number;
  tags?: AnnotationTag | AnnotationTag[];
  className?: string;
}) {
  const list = tags === undefined ? [] : Array.isArray(tags) ? tags : [tags];
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span className={PAIR_BADGE}>{noteNumber(index)}</span>
      {list.length >= 0 && (
        <span className="ml-auto flex items-center gap-0.5">
          {list.map((tag) => (
            <span key={tag} className={cn(TAG, TAG_TONES[tag])}>
              {tag}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

// A region's name, on its own line above the note: the note explains, the title says
// which part of the page is being explained, and on a list of a dozen sections that is
// what the reader scans.
function NoteTitle({ children }: { children: ReactNode }) {
  return <p className="text-foreground mb-1 text-base font-semibold">{children}</p>;
}

// A pick under this much travel is a click that moved, not a drag.
const PICK_DRAG_PX = 10;

// Where a horizontal extent stops reading as "these rows" and starts reading as "this box":
// dragging straight down and dragging clear across both mean a band, and anything between
// the two means the author was drawing a rectangle.
const PICK_BAND_SPAN = 0.05;

// The gesture in flight. Module scope rather than a ref: only one view is mounted and only
// one pointer is ever down, and this way the picker stays a plain call during render.
let pickStart: { x: number; y: number } | null = null;
let pickDragged = false;

/**
 * Dev-only coordinate picker. Click the image for a dot, drag for a region; paste the
 * logged tag into the MDX. Bands cover the whole screenshot, so a drag almost always
 * starts on top of one — hence the capture-phase click swallow, which keeps the mark
 * underneath from acting on a gesture that was never meant for it.
 */
function coordinatePicker(imageWidth: number, imageHeight: number) {
  if (!import.meta.env.DEV) return undefined;

  const at = (event: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const img = event.currentTarget.querySelector('img');
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const x = Math.round(((event.clientX - rect.left) / rect.width) * imageWidth);
    const y = Math.round(((event.clientY - rect.top) / rect.height) * imageHeight);
    // The rail and the frame's own padding sit inside this handler's element, so a press
    // there arrives here too — off-image coordinates are not a pick.
    return x < 0 || y < 0 || x > imageWidth || y > imageHeight ? null : { x, y };
  };

  return {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      pickStart = at(event);
      pickDragged = false;
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
      const start = pickStart;
      const end = at(event);
      pickStart = null;
      if (!start || !end) return;

      const top = Math.min(start.y, end.y);
      const bottom = Math.max(start.y, end.y);
      if (bottom - top < PICK_DRAG_PX) {
        console.log(`<Annotation x={${end.x}} y={${end.y}}>`);
        return;
      }

      pickDragged = true;
      const left = Math.min(start.x, end.x);
      const width = Math.abs(end.x - start.x);
      const across = width / imageWidth;
      if (across < PICK_BAND_SPAN || across > 1 - PICK_BAND_SPAN) {
        console.log(`<Annotation y={${top}} to={${bottom}} title="">`);
      } else {
        console.log(
          `<Annotation x={${left}} y={${top}} w={${width}} h={${bottom - top}} title="">`
        );
      }
    },
    // Capture, so it runs before the mark the gesture happened to start on.
    onClickCapture: (event: React.MouseEvent<HTMLDivElement>) => {
      if (!pickDragged) return;
      pickDragged = false;
      event.stopPropagation();
    },
  };
}

/**
 * Full-image view: the screenshot renders whole, in the port's flow, and scrolling is
 * the only navigation. Notes stay collapsed into their dots — hover previews one,
 * clicking pins it so the pointer is free to read or follow links.
 */
function PageView({
  notes,
  presentation,
  handoff,
  onSelect,
  layer,
  onSelectLayer,
  ...source
}: ViewProps) {
  const { imageWidth, imageHeight } = source;
  const pageRects = notes.map((note) => noteRect(note, imageWidth));
  const port = useContext(ScrollPortContext);
  const chromeSlot = useContext(ChromeSlotContext);
  const [pinned, setPinned] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // The image row at the middle of the port, as a fraction of the image.
  const readProgress = () => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const view = port.viewport();
    return clamp((view.top + view.height / 2 - rect.top) / rect.height, 0, 1);
  };

  const anchorTop = () => {
    const root = rootRef.current;
    return root === null ? null : root.getBoundingClientRect().top - port.viewport().top;
  };

  // Layout effect: both the scroll jump and the FLIP's first frame must land
  // before this view's first paint. The jump is instant — the FLIP travel is the
  // animation; a second moving scroll on top reads as lost place.
  useLayoutEffect(() => {
    if (handoff === null) return;
    const root = rootRef.current;
    const frame = frameRef.current?.getBoundingClientRect();
    const view = port.viewport();
    if (handoff.anchorTop !== null && handoff.anchorTop >= 0 && root) {
      port.scrollTo(
        port.scrollTop() + (root.getBoundingClientRect().top - view.top) - handoff.anchorTop,
        'auto'
      );
    } else if (frame && handoff.progress !== null) {
      port.scrollTo(
        port.scrollTop() +
          (frame.top - view.top) +
          handoff.progress * frame.height -
          view.height / 2,
        'auto'
      );
    }
    const travellers = flipFrom(rootRef.current, handoff.boxes);
    return () => travellers.forEach((traveller) => traveller.stop());
  }, [handoff, port]);

  useEffect(() => {
    if (pinned === null) return;
    const onPointerDown = (event: PointerEvent) => {
      // The dot's own click toggles; anything outside every note dismisses.
      if (!(event.target as Element).closest('[data-note]')) setPinned(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Claims the key so an enclosing overlay doesn't close on the same press.
      event.preventDefault();
      setPinned(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [pinned]);

  const fullscreen = presentation === 'fullscreen';

  const rail = (orientation: 'horizontal' | 'vertical') => (
    <ViewRail
      current="page"
      orientation={orientation}
      layer={layer}
      onSelectLayer={onSelectLayer}
      onSelect={(view) =>
        onSelect(view, {
          progress: readProgress(),
          anchorTop: anchorTop(),
          boxes: captureBoxes(rootRef.current),
        })
      }
    />
  );

  return (
    // Inline, 48rem of a 1440-wide source is a 2x render on retina — sharp, while
    // leaving the floating notes room to sit beside their dot instead of over the
    // content they explain. The overlay has no prose to match and can spend the room:
    // 64rem is as wide as the 2048 source still renders at 2x.
    <section
      ref={rootRef}
      data-annotations=""
      // In the overlay nothing above supplies the gutter, so the view brings its own.
      // No room is set aside for the chrome: the screenshot is one long scroll and the
      // reader is nearly always in the middle of it, so a permanent top strip would be
      // dead space for the sake of the two seconds spent at the very top.
      // pt over the uniform padding for the same reason the cursor view's stage carries
      // one: the chrome floats over this screenshot, and what it covers is page the
      // reader cannot see.
      // pt-0 stacked: the overlay reserves the chrome's band outside the scroll box, and
      // this section's own top inset would only add to a gap that is already right.
      className={cn(fullscreen && 'p-4 pt-0 lg:pt-4')}
    >
      {chromeSlot !== null && createPortal(rail('horizontal'), chromeSlot)}

      {/* The spread is the dev-only coordinate picker; production spreads nothing. */}
      <div
        ref={frameRef}
        className={cn('relative mx-auto', fullscreen ? 'max-w-5xl' : 'max-w-3xl')}
        {...coordinatePicker(imageWidth, imageHeight)}
      >
        <Screenshot
          {...source}
          sizes={fullscreen ? '(min-width: 68rem) 64rem, 100vw' : '(min-width: 52rem) 48rem, 100vw'}
          className="border-border/80 w-full rounded-xl border"
        />

        {/* Inline the rail rides the image's right edge — there the control belongs to
            the screenshot, not to the article. Absolute so the image column's geometry
            (and every dot's percentage) can't depend on it, full-height so the sticky
            child can travel the whole image and park at the same offset the cursor
            view's stage uses. Past `min-[95rem]` it hangs outside the same corner
            rather than over the image — see the note on that breakpoint. */}
        {!fullscreen && (
          <div className="absolute top-0 right-3 h-full pt-3 min-[95rem]:right-auto min-[95rem]:left-full min-[95rem]:ml-3 min-[95rem]:pt-0">
            {/* Above every note layer: this is chrome, and a note that opens under the
                pointer must not be able to bury the control that switches views. */}
            <div className="sticky top-3 z-40 min-[95rem]:top-6">{rail('vertical')}</div>
          </div>
        )}

        {notes.map((note, i) => {
          const open = pinned === i || hovered === i;
          const rect = pageRects[i];
          const region = isRegion(rect);
          // Notes open away from the nearest edge, so a mark on the right half of
          // the image never pushes its card off the image. A full-width band has no
          // near edge, so it opens the way everything else on the left does.
          const flip = (rect.x + rect.w / 2) / imageWidth > 0.5;

          // Two notes can be open at once — one pinned, one hovered — and they overlap
          // whenever their dots sit close, or unconditionally below md, where the note
          // docks to the bottom of the viewport. One shared z-index would leave DOM
          // order to break the tie, so whichever note opened *first* could end up on
          // top. Pinning a dot means hovering it first, which makes `hovered` the later
          // of the two by construction, so it takes the upper layer.
          //
          // The layer sits on this wrapper, not on the note inside it: flipFrom writes
          // a transform here during a view switch, and that would turn the wrapper into
          // a stacking context and trap any z-index set within it.
          const layer = hovered === i ? 'z-30' : pinned === i ? 'z-20' : 'z-10';

          return (
            <div
              key={i}
              data-mark=""
              data-region={region ? '' : undefined}
              data-note=""
              // Read by the overlay: a pinned note is the layer Escape dismisses first.
              data-pinned={pinned === i ? '' : undefined}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((current) => (current === i ? null : current))}
              style={markPosition(rect, imageWidth, imageHeight)}
              className={cn('absolute', region ? '' : 'size-4', layer)}
            >
              <button
                type="button"
                id={note.props.id}
                aria-label={`第 ${i + 1} 則標注`}
                aria-expanded={open}
                onClick={(event) => {
                  event.stopPropagation();
                  setPinned((current) => (current === i ? null : i));
                }}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered((current) => (current === i ? null : current))}
                className={
                  region
                    ? cn(
                        REGION,
                        bandCorners(pageRects, i, 'rounded-t-xl', 'rounded-b-xl'),
                        open && 'bg-blue-500/10'
                      )
                    : cn(
                        DOT,
                        // The visible dot stays small; a padded pseudo-element gives the
                        // pointer a 32px target on an image this long.
                        'before:absolute before:-inset-2 before:content-[""]',
                        open && 'scale-125',
                        pinned === i && 'ring-4 ring-blue-500/25'
                      )
                }
              >
                {/* A region is large and quiet, so it carries its number outright rather
                    than only on hover the way a dot does: on a page of a dozen bands the
                    frame alone does not say which note it belongs to. */}
                {region && (
                  <span aria-hidden="true" className={cn(PAIR_BADGE, 'absolute top-1.5 left-1.5')}>
                    {noteNumber(i)}
                  </span>
                )}
              </button>

              {/* Padding, not margin, bridges the mark to the card: the gap has to
                  stay inside this element or the pointer leaves on the way over.
                  A dot's card sits beside it. A region's has no beside to sit in - a
                  full-width band leaves no room either side - so it opens inside the
                  frame, under the badge, where it covers the rows it is about rather
                  than the ones it isn't. */}
              <div
                inert={!open}
                className={cn(
                  CARD_ANCHOR,
                  region
                    ? // Tucked under the badge rather than floating below it: the badge
                      // ends 26px down (6px of inset plus its own 20px box), so 32px
                      // leaves a seam and nothing more. Same x as the badge, so the two
                      // read as one block hanging off the frame's corner.
                      cn('top-8 translate-y-0', flip ? 'right-1.5' : 'left-1.5')
                    : cn(flip ? 'right-4 pr-1.5' : 'left-4 pl-1.5')
                )}
              >
                <div
                  className={cn(
                    // `scale`, not `transform`: v4's scale utilities set the
                    // standalone property, and transitioning `transform` would leave
                    // the growth to snap. transform-origin governs it all the same.
                    FLOATING_NOTE,
                    // A dot's note is a remark; a region's is a title, a summary and the
                    // ordering of everything inside the section, so it gets the 26rem the
                    // cursor view's card column uses. The same content should not read at
                    // one measure here and another there.
                    region ? 'md:w-104' : 'md:w-68',
                    // It grows out of its mark, so the corner nearest it has to
                    // be the pivot — scaling from the centre would have it swell out
                    // of its own middle, unattached to what opened it. Below md the
                    // note is a bottom sheet, so it rises from its own bottom edge.
                    flip ? 'origin-top-right' : 'origin-top-left',
                    'max-md:origin-bottom',
                    // A transition reads its timing off the state it moves *to*, so
                    // opening decelerates into place and closing just gets out of the
                    // way, quicker. ease-out and deliberately not an overshooting
                    // curve: this box carries the text the reader is already reading,
                    // and passing its final size to settle back reads as the copy
                    // resizing under them.
                    open
                      ? 'scale-100 opacity-100 duration-150 ease-out'
                      : 'scale-75 opacity-0 duration-100 ease-out'
                  )}
                >
                  <NoteMeta index={i} tags={note.props.tags} className="mb-1.5" />
                  {note.props.title && <NoteTitle>{note.props.title}</NoteTitle>}
                  <div className={FLOATING_NOTE_TEXT}>{note.props.children}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Gap between consecutive number reveals when several dots enter together: enough
// to read as one-after-another, short enough that the last one isn't left waiting.
const REVEAL_STAGGER_MS = 45;

// How long the numbers hold back when arriving from the other view. Deliberately
// shorter than the morph: they land while the image is still settling, which reads
// as one arrival instead of two separate events.
const REVEAL_AFTER_MORPH_MS = 200;

/**
 * How much of a region has to be inside the pane before it counts as the one being read.
 * A frame that lights the instant its top edge clears the pane's bottom would hand the
 * list over to a section the reader cannot see yet, while the one they are still reading
 * goes quiet.
 *
 * Taken as a minimum against the region's own height, which is what keeps a short section
 * reachable: a 90px band can never show 200px of itself, so for that one the bar becomes
 * "all of it". Nothing needs a special case at the end of the track either - the last
 * region is fully visible once the pan bottoms out, so it always qualifies.
 */
const REGION_ENTER_PX = 200;

// Room the badge needs above its dot's centre: 8px to the dot's top edge, mb-1's 4px of
// gap, then the badge's own 20px box — 32px, plus a little so it never sits flush with
// the pane's edge. Below this the pane would clip it, and it swaps to the underside.
const BADGE_CLEARANCE_PX = 36;

// The panel's own geometry, shared by both presentations.
const STAGE_BODY =
  'bg-surface flex flex-col gap-2 p-2 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-stretch lg:gap-3 lg:p-4';

// Inline the panel is a card the article scrolls past, so it keeps a margin and a
// radius. In the overlay it *is* the surface — edge to edge, and its height comes
// from measure() rather than from svh, which no fixed overlay is guaranteed to match.
const STAGE_INLINE =
  'sticky top-3 -mx-2 h-[calc(100svh-1.25rem)] rounded-2xl lg:top-6 lg:mx-0 lg:h-[calc(100svh-2rem)]';

// The overlay's chrome floats over the stage rather than sitting in a row of its own, so
// the stage owes it a strip at the top: without one the controls cover the screenshot, and
// whatever they cover is a part of the page the reader cannot see. 56px is the chrome's own
// box (12px down, 36px tall) plus a gap; at lg it needs less, because there the row's
// left end is over the card column, which starts lower than the screenshot does.
// Stacked, the overlay has already reserved the chrome's band above the scroll box, so the
// stage adds nothing on top of it - its own top padding would only widen a gap that is
// already the right size. Side by side there is no band, and STAGE_BODY's inset stands.
const STAGE_FULLSCREEN = 'sticky top-0 pt-0 lg:pt-4';

/**
 * Annotated-screenshot viewer staged as a scrollytelling stop: the whole panel is
 * sticky for the section's height, and scroll drives only the image's pan,
 * linearly. The visible pane itself is the reading window — no frame overlay:
 * whatever the pane shows is what's "in view". Cards sit in a fixed side list,
 * translucent until their dot pans into the pane; if the lit card is outside the
 * list's view, the list scrolls to it by itself.
 */
function CursorView({
  notes,
  presentation,
  handoff,
  onSelect,
  layer,
  onSelectLayer,
  ...source
}: ViewProps) {
  const { imageWidth, imageHeight } = source;
  const port = useContext(ScrollPortContext);
  const chromeSlot = useContext(ChromeSlotContext);
  const fullscreen = presentation === 'fullscreen';
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // The positioning wrapper, which is also what a region's badge shift is written to.
  const markRefs = useRef<(HTMLDivElement | null)[]>([]);
  const badgeRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stepRefs = useRef<{ up: HTMLButtonElement | null; down: HTMLButtonElement | null }>({
    up: null,
    down: null,
  });
  const linkLineRefs = useRef<(SVGLineElement | null)[]>([]);
  const linkAnchorRefs = useRef<(SVGCircleElement | null)[]>([]);
  // The note the pointer is on, which only decides which tether is drawn at full
  // strength. A ref, not state: this changes on every pointer move across the dots,
  // and the lines are drawn by measurement anyway — a re-render would buy nothing.
  const hoveredRef = useRef<number | null>(null);
  // A note whose flash is owed but not yet due: the jump to it is a smooth scroll, so
  // its dot is still outside the pane. update() spends this the frame the dot arrives.
  const pendingFlashRef = useRef<number | null>(null);
  // The scroll position a card click is travelling to. On the way the pan sweeps every
  // note between here and there through the pane, and each one would otherwise pull the
  // list to itself — sliding the very card the reader just clicked out from under their
  // pointer. Held until the pan lands on this position, and dropped if they take the
  // pan back by hand before it does.
  const listHoldRef = useRef<number | null>(null);
  // Geometry the click handlers need, published by measure() inside the effect.
  const geometryRef = useRef<{
    trackStart: number;
    trackPx: number;
    scale: number;
    paneHeight: number;
    panTravel: number;
  } | null>(null);

  const rects = notes.map((note) => noteRect(note, imageWidth));
  // Flattened to a primitive so the pan effect can depend on the notes' geometry without
  // depending on the array's identity, and still re-run when an edit moves any of it.
  const anchorKey = rects.map(({ y, h }) => `${y}:${h}`).join();

  /**
   * The tethers between each in-view note's two halves. Lighting both ends says
   * *that* they belong together; on a pane holding several dots beside a column
   * holding several cards it does not say *which* goes with which, and the reader is
   * left comparing highlights across a gap. The lines answer that outright, and they
   * are drawn for everything in view rather than on demand — pairing the two sides is
   * what the reader is doing the entire time they are here, not something they should
   * have to ask each note for one at a time. Hovering only raises one out of the set.
   *
   * Drawn from measurement rather than declared in layout: the two ends live in
   * different scroll boxes — one panned by the port, one scrolled by the reader — so
   * there is no shared coordinate system to express this in CSS. Anything that moves
   * either end calls this again. Declared above the effect that calls it, and reading
   * nothing but refs, so the effect's closure can never hold a stale copy.
   */
  const drawPairLinks = () => {
    const stage = stageRef.current;
    const list = listRef.current;
    const pane = paneRef.current;
    if (!stage || !list || !pane) return;

    const stageBox = stage.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    const paneBox = pane.getBoundingClientRect();
    const hovered = hoveredRef.current;

    // Every rect is read before any attribute is written. Both phases touch layout,
    // and interleaving them would force a reflow per note on a path that runs on
    // every frame of the pan.
    const plotted = linkLineRefs.current.map((line, i) => {
      const dot = dotRefs.current[i];
      const card = cardRefs.current[i];
      // data-active is update()'s own answer to "is this dot in the pane", so the
      // tethers and the card highlights can never disagree about what is in view.
      // It also keeps this loop off the rects of notes nowhere near the pane.
      if (!line || !dot || !card || !('active' in dot.dataset)) return null;

      const markBox = dot.getBoundingClientRect();
      // A band spanning the pane needs no tether. The line's whole job is to say which
      // of several marks a card belongs to, and it does that by running from somewhere
      // particular; a mark that reaches the pane's own right edge gives every line the
      // same origin, so they stop distinguishing anything and become a row of stubs.
      // Such a band is already unmistakable: it fills the width, and carries its number.
      if (markBox.right >= paneBox.right - 8 && markBox.left <= paneBox.left + 8) return null;

      const cardBox = card.getBoundingClientRect();
      const cardY = cardBox.top + cardBox.height / 2;
      // The card end can still be scrolled out of its own column, and a line to
      // something clipped away points at nothing — worse than no line.
      if (cardY < listBox.top || cardY > listBox.bottom) return null;

      return { markBox, cardLeft: cardBox.left, cardY };
    });

    plotted.forEach((plot, i) => {
      const line = linkLineRefs.current[i];
      const anchor = linkAnchorRefs.current[i];
      if (!line || !anchor) return;
      if (!plot) {
        line.style.opacity = '0';
        anchor.style.opacity = '0';
        return;
      }

      const { markBox, cardLeft, cardY } = plot;
      // A dot's line leaves from its centre and stands off its own 16px face. A region's
      // leaves from the edge facing the list, at the middle of the part actually inside
      // the pane: a band twice the pane's height has a centre that is nowhere on screen,
      // and a line from there would enter the pane from off-stage.
      const isBand = markBox.height > 24;
      const markX = isBand ? markBox.right : markBox.left + markBox.width / 2;
      const markY = isBand
        ? (Math.max(markBox.top, paneBox.top) + Math.min(markBox.bottom, paneBox.bottom)) / 2
        : markBox.top + markBox.height / 2;
      const standoff = isBand ? 2 : 11;

      // Stand off both ends: starting under the mark's own face would bury the line's
      // origin, and landing flush on the card's edge reads as a collision.
      const endX = cardLeft - 5;
      const dx = endX - markX;
      const dy = cardY - markY;
      const length = Math.hypot(dx, dy) || 1;

      line.setAttribute('x1', String(markX + (dx / length) * standoff - stageBox.left));
      line.setAttribute('y1', String(markY + (dy / length) * standoff - stageBox.top));
      line.setAttribute('x2', String(endX - stageBox.left));
      line.setAttribute('y2', String(cardY - stageBox.top));
      anchor.setAttribute('cx', String(endX - stageBox.left));
      anchor.setAttribute('cy', String(cardY - stageBox.top));
      line.style.opacity = '1';
      anchor.style.opacity = '1';

      // Hover picks one tether out of the set rather than being what summons it.
      for (const el of [line, anchor]) {
        if (i === hovered) el.dataset.hover = '';
        else delete el.dataset.hover;
      }
    });
  };

  // Layout effect, not effect: measurement, the handoff jump, and the first pan
  // position must all land before paint — and before Motion measures the incoming
  // layout, or the cross-view morph targets a stale frame.
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const pane = paneRef.current;
    const pan = panRef.current;
    const list = listRef.current;
    if (!section || !stage || !pane || !pan || !list) return;

    const spans =
      anchorKey === ''
        ? []
        : anchorKey.split(',').map((pair) => {
            const [y, h] = pair.split(':').map(Number);
            return { y, h };
          });
    const cards = cardRefs.current.slice(0, spans.length);
    const reveals: (ReturnType<typeof animate> | undefined)[] = spans.map(() => undefined);

    // The badge's own pop, kept off the shared transform of its positioning
    // parent so Motion can own this element's transform outright. The matching
    // fade is a CSS transition on the same delay — see the badge's classes.
    // It grows out of its dot, so a flipped badge travels the other way.
    const revealBadge = (index: number, delayMs: number) => {
      reveals[index]?.stop();
      const badge = badgeRefs.current[index];
      if (!badge || prefersReducedMotion()) return;
      reveals[index] = animate(
        badge,
        { scale: [0.4, 1], y: flipped[index] ? [-10, 0] : [10, 0] },
        { ...BADGE_REVEAL, delay: delayMs / 1000 }
      );
    };

    let trackStart = 0;
    let trackPx = 1;
    let paneHeight = 0;
    let scale = 1;
    let lastAutoScrolled = -1;
    // Mirrors each note's in-view state so a reveal only fires on the frame it
    // changes — reapplying data-active every frame would keep restarting it.
    const shown = spans.map(() => false);
    // Same idea for which side of the dot each badge hangs on.
    const flipped = spans.map(() => false);
    // Arriving from the other view, the badges hold back a moment: numbers landing
    // at the very start of the morph are lost in the motion, and the point is that
    // the reader sees them arrive. On a first mount there's nothing to wait for.
    let revealBase = handoff === null ? 0 : REVEAL_AFTER_MORPH_MS;

    const measure = () => {
      const view = port.viewport();
      // Filling the overlay exactly is measured, not declared: `100svh` is the small
      // viewport, and a `fixed inset-0` box is not promised to be that tall.
      if (fullscreen) stage.style.height = `${view.height}px`;

      // Both read the pane's *content* box, which is what the pan actually moves through.
      // The pane carries no inset today, but clientWidth/clientHeight would swallow one
      // silently — scaling the image to a width it doesn't have and putting the pane's
      // bottom edge past where the reader sees it — so the geometry asks rather than
      // assumes.
      const inset = 2 * (parseFloat(getComputedStyle(pane).paddingTop) || 0);
      paneHeight = pane.clientHeight - inset;
      scale = pan.clientWidth / imageWidth;

      // The track is the pan distance itself, so scroll maps to the image 1:1 -
      // the page view's own speed, uniform throughout; no dwells, no per-segment
      // pacing. A fixed-length track panned tall screenshots several px per
      // scrolled px, too fast to stop anywhere deliberately. Set from JS because
      // CSS can't know the rendered image height - it follows the pane's
      // measured width.
      trackPx = Math.max(Math.round(panTravel()), 1);
      section.style.height = `${stage.offsetHeight + trackPx}px`;

      const sectionTop = port.scrollTop() + (section.getBoundingClientRect().top - view.top);
      const stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
      // The pan waits until the stage pins: while the page itself is visibly
      // moving, the image holding still keeps a single moving subject on screen.
      trackStart = sectionTop - stickyTop;

      geometryRef.current = {
        trackStart,
        trackPx,
        scale,
        paneHeight,
        panTravel: panTravel(),
      };
    };

    const panTravel = () => Math.max(imageHeight * scale - paneHeight, 0);

    const update = () => {
      const position = clamp(port.scrollTop() - trackStart, 0, trackPx);
      const progress = position / trackPx;

      // The pan is linear across the whole track, so the image starts flowing the
      // instant the stage pins — motion hands off from the page to the image
      // instead of freezing, which reads as a hitch at speed.
      const panY = progress * panTravel();
      pan.style.transform = `translate3d(0, ${-panY}px, 0)`;

      // A dot inside the visible pane lights up its card; the first lit card also
      // pulls the list into view when it sits outside it.
      let firstActive = -1;
      let entering = 0;
      spans.forEach(({ y, h }, i) => {
        const markTop = y * scale;
        const markBottom = (y + h) * scale;
        // How much of the mark the pane is showing, and how much it has to show. For a
        // dot both are 0, which is exactly the old "is this row inside the pane" test.
        const visible = Math.min(markBottom, panY + paneHeight) - Math.max(markTop, panY);
        const needed = Math.min(REGION_ENTER_PX, markBottom - markTop);
        const inView = visible >= needed;
        if (inView && firstActive === -1) firstActive = i;

        // A region's badge rides its own top edge, which the pan carries above the pane
        // on any band taller than it. Pushed down by however far the top has gone, the
        // number stays with the frame instead of being clipped away from it.
        if (h > 0) {
          const el = markRefs.current[i];
          if (el) {
            const shift = clamp(panY - markTop, 0, Math.max(markBottom - markTop - 44, 0));
            el.style.setProperty('--badge-shift', `${shift}px`);
          }
        }

        // The badge hangs above its dot and the pane clips: a dot this close to the
        // pane's top edge has no room for it up there, so it swaps to the underside
        // rather than vanishing. Read every frame, not only on entering view — the pan
        // carries a dot past this line while it stays in view.
        const flipping = h === 0 && markTop - panY < BADGE_CLEARANCE_PX;
        if (flipping !== flipped[i]) {
          flipped[i] = flipping;
          const el = dotRefs.current[i];
          if (el && flipping) el.dataset.flip = '';
          else if (el) delete el.dataset.flip;
        }

        if (inView === shown[i]) return;
        shown[i] = inView;

        const dot = dotRefs.current[i];
        // Dots that come into view together cascade rather than blink on at once,
        // so the reveal reads as the numbers arriving one after another.
        if (inView && dot) {
          const delay = revealBase + entering * REVEAL_STAGGER_MS;
          dot.style.setProperty('--reveal-delay', `${delay}ms`);
          if (spans[i].h === 0) revealBadge(i, delay);
          entering += 1;
        }
        for (const el of [cards[i], dot]) {
          if (!el) continue;
          if (inView) el.dataset.active = '';
          else delete el.dataset.active;
        }

        if (inView && pendingFlashRef.current === i) {
          pendingFlashRef.current = null;
          flashCard(cards[i]);
        }
      });
      // Only the arrival is choreographed; later reveals answer the scroll directly.
      if (entering > 0) revealBase = 0;

      // A step is only offered while there is a note outside the pane to step to — the
      // same band the active state reads, from the other side.
      stepRefs.current.up?.setAttribute(
        'aria-disabled',
        String(!spans.some(({ y }) => y * scale < panY))
      );
      stepRefs.current.down?.setAttribute(
        'aria-disabled',
        String(!spans.some(({ y, h }) => (y + h) * scale > panY + paneHeight))
      );

      // A card click's pan has landed once scroll reaches the position it asked for;
      // a sub-pixel tolerance because smooth scrolling stops near, not on, its target.
      if (listHoldRef.current !== null && Math.abs(port.scrollTop() - listHoldRef.current) <= 1) {
        listHoldRef.current = null;
      }

      if (firstActive !== -1 && firstActive !== lastAutoScrolled) {
        // Spent either way: once the pan settles, the note it settled on must not get
        // a second, late pull of the list on some unrelated later frame.
        lastAutoScrolled = firstActive;
        const card = cards[firstActive];
        if (card && listHoldRef.current === null) {
          const outOfView =
            card.offsetTop < list.scrollTop ||
            card.offsetTop + card.offsetHeight > list.scrollTop + list.clientHeight;
          if (outOfView) {
            list.scrollTo({ top: card.offsetTop - 12, behavior: scrollBehavior() });
          }
        }
      }

      // The pan has just moved every dot; a tether drawn against the old positions
      // would trail behind the note it belongs to.
      drawPairLinks();
    };

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };
    const remeasure = () => {
      measure();
      update();
    };
    // The reader taking the pan back by hand abandons whatever the last click was
    // still doing. The flash answers "which card did I land on", and after a manual pan
    // it would fire on one merely passed; the list hold is waiting on a scroll position
    // that is no longer being travelled to, and would otherwise never be released.
    const abandonPendingJump = () => {
      pendingFlashRef.current = null;
      listHoldRef.current = null;
    };

    remeasure();
    // The reader arrives from the other view: hold the section's port offset
    // when its top was visible, otherwise jump so the same image row sits
    // mid-pane; update() again for the new scroll, then start the FLIP from the
    // boxes the click captured — all in this same pre-paint pass, so the morph
    // both starts and ends on what was on screen.
    if (handoff !== null) {
      if (handoff.anchorTop !== null && handoff.anchorTop >= 0) {
        const view = port.viewport();
        port.scrollTo(
          port.scrollTop() + (section.getBoundingClientRect().top - view.top) - handoff.anchorTop,
          'auto'
        );
        update();
      } else if (handoff.progress !== null) {
        const travel = panTravel();
        const targetTop = clamp(handoff.progress * imageHeight * scale - paneHeight / 2, 0, travel);
        port.scrollTo(trackStart + (travel > 0 ? targetTop / travel : 0) * trackPx, 'auto');
        update();
      }
    }
    const travellers = handoff === null ? [] : flipFrom(section, handoff.boxes);

    // The FLIP moves every dot for the next half second, and nothing else in this effect
    // redraws while it does: the tethers were measured once, before the flight, so each
    // one points at where its dot came from — in the other view, at the other view's
    // scale — and stays there until the reader happens to scroll or hover. So follow the
    // travellers frame by frame, the same reason the pan redraws them on every frame of
    // its own, and draw once more where they land.
    let flightRaf = 0;
    if (travellers.length > 0) {
      const follow = () => {
        drawPairLinks();
        flightRaf = requestAnimationFrame(follow);
      };
      flightRaf = requestAnimationFrame(follow);
      const land = () => {
        cancelAnimationFrame(flightRaf);
        flightRaf = 0;
      };
      // A traveller stopped by this effect's cleanup rejects; there is nothing left to
      // draw against by then, so both outcomes only have to stop the loop.
      Promise.all(travellers.map((traveller) => traveller.finished)).then(() => {
        land();
        drawPairLinks();
      }, land);
    }
    const unsubscribe = port.subscribe(onScroll);
    window.addEventListener('resize', remeasure);
    window.addEventListener('wheel', abandonPendingJump, { passive: true });
    window.addEventListener('touchmove', abandonPendingJump, { passive: true });
    // The other end of the tether moves whenever this column scrolls — under the
    // reader's own wheel in the overlay, or under an auto-scroll in either.
    const onListScroll = () => drawPairLinks();
    list.addEventListener('scroll', onListScroll, { passive: true });
    // Fires on image load and font swap too — anything that reflows the section.
    const observer = new ResizeObserver(remeasure);
    observer.observe(section);

    return () => {
      cancelAnimationFrame(flightRaf);
      travellers.forEach((traveller) => traveller.stop());
      reveals.forEach((reveal) => reveal?.stop());
      cancelAnimationFrame(raf);
      unsubscribe();
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('wheel', abandonPendingJump);
      window.removeEventListener('touchmove', abandonPendingJump);
      list.removeEventListener('scroll', onListScroll);
      observer.disconnect();
    };
  }, [anchorKey, imageWidth, imageHeight, handoff, port, fullscreen]);

  // The scroll position at which the pane settles on this note's mark. A mark that fits
  // gets centred; one taller than the pane is brought to its top edge instead, because
  // centring a band twice the pane's height shows its middle and neither of its ends.
  const noteScrollTarget = (index: number) => {
    const geometry = geometryRef.current;
    if (!geometry) return null;
    const { trackStart, trackPx, scale, paneHeight, panTravel } = geometry;
    const { y, h } = rects[index];
    const targetTop = clamp(
      h * scale > paneHeight ? y * scale - 12 : (y + h / 2) * scale - paneHeight / 2,
      0,
      panTravel
    );
    return trackStart + (panTravel > 0 ? targetTop / panTravel : 0) * trackPx;
  };

  // The image row at the top of the pane, in rendered px — the reader's window into
  // the screenshot, which is what both the step buttons and the handoff reason about.
  const paneTop = () => {
    const geometry = geometryRef.current;
    if (!geometry) return null;
    const { trackStart, trackPx, panTravel } = geometry;
    return clamp((port.scrollTop() - trackStart) / trackPx, 0, 1) * panTravel;
  };

  // Both views trade the same currency: the image row the reader is centred on, as
  // a fraction of the image. Here that is the middle of the visible pane.
  const readProgress = () => {
    const geometry = geometryRef.current;
    const top = paneTop();
    if (!geometry || top === null) return null;
    return (top + geometry.paneHeight / 2) / (imageHeight * geometry.scale);
  };

  /**
   * `from` is the surface the reader started the jump on, and it decides whether the
   * list may follow the pan. From the image or the step rail it must: the card being
   * jumped to is very likely off-screen in the list, and bringing it into view is the
   * point. From a card it must not: that card is already in front of them, under the
   * pointer that clicked it, and moving it there is the one thing they didn't ask for.
   */
  const scrollToNote = (index: number, from: 'image' | 'list' = 'image') => {
    const target = noteScrollTarget(index);
    if (target === null) return;
    if (from === 'list') listHoldRef.current = target;
    port.scrollTo(target, scrollBehavior());
  };

  // The flash is the answer to "which card did I just land on", so it has to happen
  // where the reader is looking: on a card that is already lit, now; on one the scroll
  // is still travelling towards, only once its dot reaches the pane.
  const requestFlash = (index: number) => {
    const card = cardRefs.current[index];
    if (card && 'active' in card.dataset) flashCard(card);
    else pendingFlashRef.current = index;
  };

  // Step to the nearest note *outside* the pane — the forgiving way to move on when
  // wheel precision is a struggle. Measured against the pane, not against scroll
  // targets: the pane holds several notes at once, and every one of them still has a
  // centering target further down the track, so "next" by target would step to a note
  // the reader is already looking at.
  const stepToNote = (direction: 1 | -1) => {
    const geometry = geometryRef.current;
    const top = paneTop();
    if (!geometry || top === null) return;
    const { scale, paneHeight } = geometry;
    let index = -1;
    if (direction > 0) {
      index = rects.findIndex(({ y }) => y * scale > top + paneHeight);
    } else {
      rects.forEach(({ y, h }, i) => {
        if ((y + h) * scale < top) index = i;
      });
    }
    if (index === -1) return;
    scrollToNote(index);
    requestFlash(index);
  };

  // Hovering either side pre-lights the other — the pairing reads both ways.
  const setPairHover = (index: number, on: boolean) => {
    for (const el of [dotRefs.current[index], cardRefs.current[index]]) {
      if (!el) continue;
      if (on) el.dataset.hover = '';
      else delete el.dataset.hover;
    }
    // Leaving only clears the tether if it still belongs to the note being left: the
    // pointer can reach the next dot before the previous one's leave handler runs.
    if (on) hoveredRef.current = index;
    else if (hoveredRef.current === index) hoveredRef.current = null;
    drawPairLinks();
  };

  // Rendered at two anchors below, so the handler lives here rather than twice inline.
  const selectView = (view: AnnotationsView) =>
    onSelect(view, {
      progress: readProgress(),
      anchorTop:
        sectionRef.current === null
          ? null
          : sectionRef.current.getBoundingClientRect().top - port.viewport().top,
      boxes: captureBoxes(sectionRef.current),
    });

  const stepRail = (className: string) => (
    // Fallback for wheel precision: step straight to the previous/next note.
    // Absolutely positioned — never part of layout flow, so it can't shift anything.
    <motion.div
      initial={handoff === null ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      role="group"
      aria-label="逐則移動"
      // Always stacked, wherever it sits: up has to be above down.
      className={cn(RAIL_BODY, RAIL_COLUMN, className)}
    >
      <button
        ref={(el) => {
          stepRefs.current.up = el;
        }}
        type="button"
        aria-label="上一則標注"
        onClick={() => stepToNote(-1)}
        className={cn(RAIL_CELL, RAIL_CELL_ICON, RAIL_CELL_STEP)}
      >
        <HugeiconsIcon icon={ArrowUp01Icon} className="size-5" />
      </button>
      <button
        ref={(el) => {
          stepRefs.current.down = el;
        }}
        type="button"
        aria-label="下一則標注"
        onClick={() => stepToNote(1)}
        className={cn(RAIL_CELL, RAIL_CELL_ICON, RAIL_CELL_STEP)}
      >
        <HugeiconsIcon icon={ArrowDown01Icon} className="size-5" />
      </button>
    </motion.div>
  );

  // The section carries no CSS height: measure() sets it - stage height plus the
  // scroll track.
  return (
    <section ref={sectionRef} data-annotations="">
      <div
        ref={stageRef}
        // Stacked until lg: below it the side-by-side split gives the pane too little
        // width to read the screenshot at all. Stacked, the panel eats into the
        // article's px-6 gutter and thins its own padding: on a small screen the
        // screenshot is the scarce thing, and every pixel spent framing it is one the
        // image doesn't get. The negative margin has to stay within that 24px gutter,
        // or the page picks up sideways scroll. measure() reads the computed sticky
        // offset, so the scroll track follows whichever variant is in play.
        className={cn(STAGE_BODY, fullscreen ? STAGE_FULLSCREEN : STAGE_INLINE)}
      >
        <div
          ref={paneRef}
          // rounded-lg, not xl, once the panel's padding drops to 8px: the inner radius
          // has to shrink with the inset or the two arcs stop looking concentric.
          //
          // The screenshot runs to this box's own edges and takes its corners from this
          // clip, so nothing sits between the two. What that costs is a band's frame at
          // either end of the image, which would be squared off across the curve — see
          // bandCorners, which hands those two the same radius named here.
          //
          // group/pane: the step rail inside recedes until the pointer is on the image.
          className="border-border/80 bg-muted group/pane relative h-[52svh] shrink-0 overflow-hidden rounded-lg border lg:h-full lg:rounded-xl"
        >
          {/* The spread is the dev-only coordinate picker; production spreads nothing. */}
          <div
            ref={panRef}
            className="relative will-change-transform"
            {...coordinatePicker(imageWidth, imageHeight)}
          >
            {/* The pane is whatever the 26rem card column leaves, which lands near
                60vw inline and near 70vw in the overlay's wider stage. Stated a touch
                generously: erring high only ever costs a sharper file. */}
            <Screenshot
              {...source}
              sizes={
                fullscreen ? '(min-width: 64rem) 70vw, 100vw' : '(min-width: 64rem) 60vw, 100vw'
              }
              className="w-full"
            />

            {rects.map((rect, i) => {
              const region = isRegion(rect);
              return (
                <div
                  key={i}
                  ref={(el) => {
                    markRefs.current[i] = el;
                  }}
                  data-mark=""
                  data-region={region ? '' : undefined}
                  style={markPosition(rect, imageWidth, imageHeight)}
                  className={cn('absolute', !region && 'size-4')}
                >
                  <button
                    ref={(el) => {
                      dotRefs.current[i] = el;
                    }}
                    type="button"
                    aria-label={`前往第 ${i + 1} 則標注`}
                    onClick={(event) => {
                      event.stopPropagation();
                      scrollToNote(i);
                      requestFlash(i);
                    }}
                    onMouseEnter={() => setPairHover(i, true)}
                    onMouseLeave={() => setPairHover(i, false)}
                    className={
                      region
                        ? cn(
                            REGION,
                            bandCorners(
                              rects,
                              i,
                              'rounded-t-lg lg:rounded-t-xl',
                              'rounded-b-lg lg:rounded-b-xl'
                            ),
                            // Out of view the frame recedes to a hairline of itself, so a
                            // dozen bands don't fight the screenshot they sit on; in view it
                            // is the full ring the page view draws.
                            // Nothing until it is the one being read: a faint frame on
                            // every section ahead reads as a grid drawn over the page
                            // rather than as an answer to where the reader is.
                            'ring-0 data-active:bg-blue-500/5 data-active:ring-2 data-active:ring-blue-500 data-hover:ring-2 data-hover:ring-blue-500'
                          )
                        : cn(DOT, 'data-active:scale-125 data-hover:scale-125')
                    }
                  >
                    {/* The pairing label stays invisible until the mark matters - panned
                      into the pane or hovered — so the image keeps its clean dots.
                      Two elements: the outer one places the badge and keeps the
                      centering translate, so revealBadge's spring has this element's
                      transform to itself. block, because a transform does nothing to
                      an inline box. */}
                    <span
                      aria-hidden="true"
                      // A region's badge sits inside its own top-left corner and is pushed
                      // down by --badge-shift once the pan carries that corner off the pane.
                      // A dot's hangs above it, and data-flip is written by update() when
                      // the pane's top edge leaves no room up there — see BADGE_CLEARANCE_PX.
                      className={
                        region
                          ? 'pointer-events-none absolute top-1.5 left-1.5 translate-y-[var(--badge-shift,0px)]'
                          : 'pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 group-data-flip:top-full group-data-flip:bottom-auto group-data-flip:mt-1 group-data-flip:mb-0'
                      }
                    >
                      <span
                        ref={(el) => {
                          badgeRefs.current[i] = el;
                        }}
                        className={cn(
                          PAIR_BADGE,
                          'block shadow-sm transition-opacity duration-150',
                          // A dot hides its number until it matters. A region cannot: the
                          // frame is already on screen, and an unlabelled box is a box the
                          // reader can't match to anything in the list.
                          region
                            ? 'opacity-0 group-data-active:opacity-100 group-data-hover:opacity-100'
                            : cn(
                                'opacity-0 group-hover:opacity-100 group-data-active:opacity-100 group-data-hover:opacity-100',
                                // Only the arrival staggers, and only in: the delay is scoped
                                // to data-active so leaving view and plain hover both answer
                                // at once. The spring is given the same delay directly.
                                'group-data-active:[transition-delay:var(--reveal-delay,0ms)]'
                              )
                        )}
                      >
                        {noteNumber(i)}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Sibling of the panning layer, so it holds still while the image moves
              under it. Inline it is anchored to the pane rather than to the stage,
              because the stage's own top-right corner is the card list once the two
              sit side by side — there the control belongs to the image. */}
          {!fullscreen && (
            <ViewRail
              current="cursor"
              orientation="vertical"
              onSelect={selectView}
              layer={layer}
              onSelectLayer={onSelectLayer}
              className="absolute top-2 right-2 z-20 lg:top-3 lg:right-3 min-[95rem]:hidden"
            />
          )}

          {/* In the overlay the stage spans the viewport, so there is no "outside" to
              hang the step rail off — it rides the opposite corner of the same pane,
              far from the view rail it must not be confused with. Still lg and up
              only: the pane stacked is too small to give a corner away, and there a
              card is already the thing you tap to move. */}
          {/* The only control that sits on the screenshot itself, so it stays faint until
              the reader's pointer is on the image or something inside it takes focus.
              Fully hidden would leave the wheel as the only way to step.
              The fade lives on this wrapper rather than on the rail: the rail is a
              motion.div animating its own opacity, which writes the property inline, and
              no class can outrank that. Nested, the two multiply — 0.3 at rest, 1 when the
              pointer arrives — and the rail keeps its entrance fade to itself. */}
          {fullscreen && (
            <div className="absolute right-3 bottom-3 z-20 opacity-30 transition-opacity duration-200 group-hover/pane:opacity-100 focus-within:opacity-100 max-lg:hidden">
              {stepRail('')}
            </div>
          )}
        </div>

        {/* At lg this column is what lies under the screen's top-right corner, so it stands
            off below the chrome — the pane keeps the full height, and only the column that
            would collide gives anything up. The inset is on this wrapper rather than on the
            scroll box below, because padding belongs to the scrollable overflow region: as
            padding it would be a strip the cards slide up through, and the point is that
            they never reach it. Stacked, the stage's own top inset already cleared the row
            and this column is nowhere near it. */}
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col lg:h-full lg:flex-none',
            fullscreen && 'lg:pt-11'
          )}
        >
          {/* Who owns the wheel here differs by presentation, and it has to.
              Inline, the port is the page: this stage is one stop on an article the
              reader is scrolling through, so a list that ate the wheel would strand
              anyone whose pointer happened to be on the right-hand side, with no way
              past the section. It stays inert, and only a card lighting up moves it.
              In the overlay the port is the viewer's own box and there is always a way
              out, so the column can take the wheel: reading straight down the notes
              without dragging the screenshot along is the whole reason they are listed.
              overscroll-contain keeps that reading from spilling back into the pan at
              either end — reaching the last note should not launch the image. */}
          <div
            ref={listRef}
            className={cn(
              'relative min-h-0 flex-1',
              fullscreen ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'
            )}
          >
            {/* Chrome the other view doesn't have fades in rather than popping — only
                when arriving from a switch (handoff set), never on first load. */}
            <motion.div
              initial={handoff === null ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-1.5 lg:space-y-2"
            >
              {notes.map((note, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  id={note.props.id}
                  role="button"
                  tabIndex={0}
                  onMouseEnter={() => setPairHover(i, true)}
                  onMouseLeave={() => setPairHover(i, false)}
                  onClick={(event) => {
                    // Links inside the note keep their own behavior.
                    if ((event.target as HTMLElement).closest('a')) return;
                    scrollToNote(i, 'list');
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    scrollToNote(i, 'list');
                  }}
                  onAnimationEnd={(event) => {
                    if (event.animationName === 'annotation-flash')
                      delete event.currentTarget.dataset.flash;
                  }}
                  className={cn(
                    CARD,
                    // The compact overrides live here rather than in CARD: they belong to
                    // this list under a stacked panel, not to the card itself.
                    'max-lg:rounded-lg max-lg:px-3 max-lg:pt-2 max-lg:pb-2.5',
                    'focus-visible:ring-ring cursor-pointer opacity-45 focus-visible:ring-2 focus-visible:outline-hidden data-active:cursor-auto data-active:border-blue-500/70 data-active:opacity-100 data-active:shadow-sm data-flash:animate-[annotation-flash_0.9s_ease-out] data-hover:opacity-100'
                  )}
                >
                  <NoteMeta index={i} tags={note.props.tags} className="mb-2 max-lg:mb-1.5" />
                  {note.props.title && <NoteTitle>{note.props.title}</NoteTitle>}
                  <div className={NOTE_TEXT}>{note.props.children}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* The tethers, spanning the whole stage because each one's two ends sit in
            different children of it. Last in the stage so they draw over both the pane
            and the cards, but before the rails — chrome still wins, and a line passing
            under a control is the correct reading of which of the two is on top.
            One line per note, kept mounted and moved by attribute rather than added
            and removed: a set this small costs nothing to keep, and a node that stays
            put can fade rather than blink. Coordinates come from drawPairLinks; the
            elements themselves carry none. */}
        <svg
          aria-hidden="true"
          // Side-by-side only, which is also the only layout the geometry above
          // assumes: it lands each line on its card's left edge because that is the
          // edge facing the pane. Stacked, the pane sits above a full-width column,
          // so every tether would have to run down through the cards in between to
          // reach its own.
          className="pointer-events-none absolute inset-0 h-full w-full max-lg:hidden"
        >
          {notes.map((_, i) => (
            <g key={i}>
              {/* Faint by default: several of these are on screen at once and they
                  are a background reading aid, not marks in their own right. The
                  hovered one steps forward — see setPairHover. */}
              <line
                ref={(el) => {
                  linkLineRefs.current[i] = el;
                }}
                strokeDasharray="4 4"
                strokeWidth={1.25}
                strokeLinecap="round"
                className="stroke-blue-500 opacity-0 transition-[opacity,stroke] duration-150 data-hover:stroke-blue-500/75"
              />
              {/* The card end has no mark of its own the way the dot does, so the
                  line brings one and stops reading as a stroke into empty space. */}
              <circle
                ref={(el) => {
                  linkAnchorRefs.current[i] = el;
                }}
                r={2.5}
                className="fill-blue-500/35 opacity-0 transition-[opacity,fill] duration-150 data-hover:fill-blue-500/85"
              />
            </g>
          ))}
        </svg>

        {/* Wide screens only: the same rails hanging off the stage's right edge, clear
            of the screenshot entirely. Outside layout flow, so the stage's height — the
            scroll mapping's denominator — can't depend on them. The step rail stays
            wide-only even inline: it exists because a wheel overshoots, and where
            there's no room for it there's no wheel either — tapping a card already
            scrolls to its note. */}
        {!fullscreen && (
          <>
            <ViewRail
              current="cursor"
              orientation="vertical"
              onSelect={selectView}
              layer={layer}
              onSelectLayer={onSelectLayer}
              className="absolute top-0 left-full ml-3 hidden min-[95rem]:flex"
            />
            {stepRail('absolute top-1/2 left-full ml-3 hidden -translate-y-1/2 min-[95rem]:flex')}
          </>
        )}

        {chromeSlot !== null &&
          createPortal(
            <ViewRail
              current="cursor"
              orientation="horizontal"
              onSelect={selectView}
              layer={layer}
              onSelectLayer={onSelectLayer}
            />,
            chromeSlot
          )}
      </div>
    </section>
  );
}
