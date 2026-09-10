'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Event-delegating accordion. Children are server-rendered; items carry `data-acc-item`
 * and their trigger buttons `data-acc-trigger`. Toggling `.is-open` on the item is all the
 * mock CSS needs (`.is-open > .acc-panel { grid-template-rows: 1fr }`).
 */
export function Accordion({ mode = 'single', className, id, style, children }: { mode?: 'single' | 'multi'; className?: string; id?: string; style?: React.CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const trigger = (e.target as HTMLElement).closest<HTMLElement>('[data-acc-trigger]');
      if (!trigger || !root.contains(trigger)) return;
      const item = trigger.closest<HTMLElement>('[data-acc-item]');
      if (!item) return;
      const willOpen = !item.classList.contains('is-open');
      if (mode === 'single' && willOpen) {
        root.querySelectorAll<HTMLElement>('[data-acc-item].is-open').forEach((other) => {
          if (other === item) return;
          other.classList.remove('is-open');
          other.querySelector('[data-acc-trigger]')?.setAttribute('aria-expanded', 'false');
        });
      }
      item.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [mode]);
  return (
    <div ref={ref} id={id} className={className} style={style} data-accordion={mode}>
      {children}
    </div>
  );
}
