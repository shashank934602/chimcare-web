'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ServiceRow } from '@/lib/db/schema';
import { Icon } from '@/components/chrome/Icon';

/**
 * The service drawer — a right-hand panel on desktop, a bottom sheet on phones (`.drawer` in the
 * city mock's CSS).
 *
 * It shows one service's full detail without leaving the page. Everything it displays comes from the
 * `ServiceRow` it is opened with: name, short line, body paragraphs, "why it matters", and the
 * included list. Nothing is generated here — a row with no `why` simply renders no "why" block.
 *
 * Opened by any element carrying `data-drawer-open="<service key>"`, so a template adds a trigger
 * without importing this component or holding state. Closing restores focus to the trigger, Escape
 * closes, and the background scroll lock matches the booking sheet's.
 */
export function ServiceDrawer({
  rows,
  eyebrow,
  phone,
  phoneHref,
  bookCta = 'Schedule Service',
}: {
  rows: ServiceRow[];
  eyebrow: string;
  phone: string;
  phoneHref: string;
  bookCta?: string;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const row = openKey ? rows.find((r) => r.key === openKey) ?? null : null;
  const index = row ? rows.indexOf(row) : -1;

  const close = useCallback(() => {
    setOpenKey(null);
    document.body.classList.remove('no-scroll');
    lastTrigger.current?.focus({ preventScroll: true });
    lastTrigger.current = null;
  }, []);

  // Delegated, so triggers can be server-rendered anywhere in the template.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const trigger = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-drawer-open]');
      if (!trigger) return;
      const key = trigger.getAttribute('data-drawer-open');
      if (!key || !rows.some((r) => r.key === key)) return;
      e.preventDefault();
      lastTrigger.current = trigger;
      setOpenKey(key);
      document.body.classList.add('no-scroll');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [rows]);

  useEffect(() => {
    if (!openKey) return;
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    const t = setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 120);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')].filter(
        (el) => el.offsetParent !== null,
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [openKey, close]);

  return (
    <div className={row ? 'drawer is-open' : 'drawer'} id="drawer" aria-hidden={!row}>
      <div className="drawer-bg" data-drawer-close onClick={close} />
      <div className="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabIndex={-1} ref={panelRef}>
        <div className="handle" aria-hidden="true" />
        <div className="drawer-head">
          <p className="eyebrow">{eyebrow}</p>
          <button className="drawer-close" type="button" data-drawer-close aria-label="Close" onClick={close}>
            <Icon name="x" />
          </button>
        </div>
        <div className="drawer-body" ref={bodyRef}>
          {row && (
            <>
              <span className="n" id="drawer-n">{String(index + 1).padStart(2, '0')}</span>
              <h3 id="drawer-title">{row.name}</h3>
              <p className="intro" id="drawer-intro">{row.short}</p>
              <div className="svc-body" id="drawer-main">
                {row.paragraphs.map((t) => <p key={t.slice(0, 40)}>{t}</p>)}
              </div>
              {row.why && (
                <div className="drawer-why">
                  <p className="eyebrow">Why it matters</p>
                  <p id="drawer-why">{row.why}</p>
                </div>
              )}
              {row.included.length > 0 && (
                <div className="svc-body" id="drawer-side">
                  <h4>What&rsquo;s included</h4>
                  <ul className="svc-list">
                    {row.included.map((x) => <li key={x}><Icon name="check" />{x}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
        <div className="drawer-foot">
          <a className="btn btn-primary" id="drawer-book" href="#booking" data-book onClick={close}>
            {row?.cta ?? bookCta}
          </a>
          <a className="phone" href={phoneHref}><Icon name="phone" />{phone}</a>
        </div>
      </div>
    </div>
  );
}
