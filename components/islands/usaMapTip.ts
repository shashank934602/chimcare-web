/**
 * The US map's tooltip and state highlight: the saved homepage's own `chimcare-map-tip` script, ported. Point at
 * (or tap, or tab to) a state and its name shows, with its towns when Chimcare lists some, or "Chimcare serves
 * this state"; the state under the pointer is marked `is-active`. Escape or leaving the map hides it.
 *
 * Shared by the homepage (HomeBehaviour) and the About page's copy of the same map (UsaMapTooltip), so the two
 * maps behave the same. `map` is the positioned box the tooltip is placed in; `tip` is the `.cc-tip` inside it.
 */
export function attachUsaMapTooltip(map: HTMLElement, tip: HTMLElement, signal: AbortSignal): void {
  let active: Element | null = null;
  const show = (g: Element, x: number, y: number) => {
    if (active && active !== g) active.classList.remove('is-active');
    active = g;
    g.classList.add('is-active');
    const name = g.getAttribute('data-name') ?? '';
    const towns = g.getAttribute('data-towns');
    const body = towns || (g.classList.contains('is-on') ? 'Chimcare serves this state' : '');
    tip.replaceChildren();
    const b = document.createElement('b');
    b.textContent = name;
    tip.append(b);
    if (body) {
      const span = document.createElement('span');
      span.textContent = body;
      tip.append(span);
    }
    tip.hidden = false;
    const r = map.getBoundingClientRect();
    tip.style.left = '0px';
    tip.style.top = '0px';
    const tw = tip.offsetWidth;
    const pad = 6;
    tip.style.left = `${Math.max(tw / 2 + pad, Math.min(x - r.left, r.width - tw / 2 - pad))}px`;
    const above = y - r.top - 10;
    const below = above - tip.offsetHeight * 1.15 < 0;
    tip.classList.toggle('is-below', below);
    tip.style.top = `${below ? y - r.top + 16 : above}px`;
  };
  const hide = () => {
    active?.classList.remove('is-active');
    active = null;
    tip.hidden = true;
  };
  const at = (e: Event) => (e.target as Element).closest?.('.cc-st') ?? null;
  const follow = (e: PointerEvent | MouseEvent) => {
    const g = at(e);
    if (g) show(g, e.clientX, e.clientY);
    else hide();
  };
  map.addEventListener('pointermove', follow, { signal });
  map.addEventListener('click', follow, { signal });
  map.addEventListener('pointerleave', hide, { signal });
  map.addEventListener('focusin', (e) => {
    const g = at(e);
    if (!g) return;
    const b = g.getBoundingClientRect();
    show(g, b.left + b.width / 2, b.top + b.height / 2);
  }, { signal });
  map.addEventListener('focusout', hide, { signal });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && hide(), { signal });
}
