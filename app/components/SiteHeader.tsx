import { Bars3Icon, XMarkIcon } from '@heroicons/react/20/solid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';

import { cn } from '~/lib/utils';

const NAV_ITEMS = [
  { label: 'About', to: '/' },
  { label: 'Components', to: '/components' },
  { label: 'Design', to: '/design' },
  { label: 'System', to: '/system' },
  { label: 'Blog', to: '/blog' },
];

const ICON_BUTTON_STYLE =
  'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring -mr-2 rounded-full p-2 transition-colors focus-visible:ring-2 focus-visible:outline-hidden';

export function SiteHeader() {
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  // Tying the panel to the path it was opened on closes it on any navigation —
  // link, back, or forward — without an effect that re-renders after paint.
  const [openedPathname, setOpenedPathname] = useState<string | null>(null);
  const open = openedPathname === pathname;

  const close = useCallback(() => {
    setOpenedPathname(null);
    toggleRef.current?.focus();
  }, []);

  // A full-screen panel is a modal: focus moves in and stays in, the page behind
  // it must not scroll, and Escape gets you out.
  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>('a[href], button');
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
    };
  }, [open, close]);

  return (
    <header className="px-4 py-5 sm:px-6">
      <div className="flex items-center justify-between sm:hidden">
        <span className="text-foreground text-sm font-medium">justincy</span>
        <button
          ref={toggleRef}
          type="button"
          aria-label="選單"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpenedPathname(pathname)}
          className={ICON_BUTTON_STYLE}
        >
          <Bars3Icon className="size-5" />
        </button>
      </div>

      <nav className="hidden items-center justify-center gap-1 text-sm sm:flex">
        {NAV_ITEMS.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'focus-visible:ring-ring rounded-full px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
                // Hover is scoped to inactive items so its lighter fill can't override the
                // active pill's solid one — both are bg utilities, and the variant wins.
                isActive
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="選單"
          className="bg-background animate-in fade-in slide-in-from-top-2 fixed inset-0 z-50 flex flex-col px-4 duration-200 sm:hidden"
        >
          {/* Same padding as the closed bar, so the wordmark holds its position and
              only the icon swaps when the panel opens. */}
          <div className="flex items-center justify-between py-5">
            <span className="text-foreground text-sm font-medium">justincy</span>
            <button
              ref={closeRef}
              type="button"
              aria-label="關閉選單"
              onClick={close}
              className={ICON_BUTTON_STYLE}
            >
              <XMarkIcon className="size-5" />
            </button>
          </div>

          <nav className="divide-border/80 border-border/80 divide-y border-t">
            {NAV_ITEMS.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'focus-visible:ring-ring block py-4 transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
                    isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
