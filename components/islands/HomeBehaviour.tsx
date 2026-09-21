'use client';

import { useEffect } from 'react';
import type { BookingPrefill, ServiceKey } from '@/lib/booking/types';
import { MOBILE_MENU_STATE_EVENT, openMobileMenu } from './MobileMenu';
import { attachUsaMapTooltip } from './usaMapTip';

/**
 * The homepage is WordPress/Elementor markup rendered verbatim (app/_home/content.ts), with every WordPress
 * script stripped. This island gives that markup back the behaviour those scripts provided, working on the
 * existing classes and attributes so the page still looks exactly like production:
 *
 *   - the Elementor nav menu toggle (mobile/tablet) → the site's full-screen menu, and the sticky header bar
 *   - FAQ accordion (one item open at a time, as Elementor does)
 *   - counters counting up when they scroll into view
 *   - the US map tooltip (the saved page's own `chimcare-map-tip` script, ported)
 *   - the hero's "Check My Area" card → opens the app booking sheet,
 *     prefilled with the service and ZIP already entered (see app/_home/hero.ts for the markup)
 *   - the location search → the locations hub
 *
 * Content never depends on this running: with no JS the page shows the same text, counters show their
 * final values and the first FAQ answer is open.
 */

// Gravity Forms option text → booking service. Order matters: "Chimney Sweep + Inspection" is a sweep.
const SERVICE_BY_OPTION: [RegExp, ServiceKey][] = [
  [/sweep/i, 'sweep'],
  [/gas/i, 'gas'],
  [/inspection/i, 'inspect'],
  [/quote/i, 'quote'],
];
export const serviceFromOption = (option: string): ServiceKey | null =>
  SERVICE_BY_OPTION.find(([re]) => re.test(option))?.[1] ?? null;

export function HomeBehaviour() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.wp-home');
    if (!root) return;
    const ac = new AbortController();
    const { signal } = ac;
    const cleanups: (() => void)[] = [];
    const onKeyActivate = (el: HTMLElement, fn: () => void) =>
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fn();
        }
      }, { signal });

    // ---- nav menu toggle ----------------------------------------------------------------------
    // Opens the site's full-screen menu (MobileMenu.tsx) instead of Elementor's short drop panel, which stays
    // closed; the toggle keeps its `elementor-active` look and `aria-expanded` in step with the menu.
    const toggles = root.querySelectorAll<HTMLElement>('.elementor-menu-toggle');
    toggles.forEach((toggle) => {
      toggle.setAttribute('aria-controls', 'mobile-menu');
      toggle.addEventListener('click', openMobileMenu, { signal });
      onKeyActivate(toggle, openMobileMenu);
    });
    document.addEventListener(MOBILE_MENU_STATE_EVENT, (e) => {
      const on = Boolean((e as CustomEvent<{ open: boolean }>).detail?.open);
      toggles.forEach((toggle) => {
        toggle.classList.toggle('elementor-active', on);
        toggle.setAttribute('aria-expanded', String(on));
      });
    }, { signal });

    // ---- sticky header ------------------------------------------------------------------------
    // Elementor's sticky: once the bar reaches `sticky_offset` from the top it is fixed there, and a hidden
    // clone keeps its place in the flow so nothing below jumps.
    const header = root.querySelector<HTMLElement>('.header-template.elementor-sticky');
    if (header) {
      const offset = 20;
      const spacer = header.cloneNode(true) as HTMLElement;
      spacer.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      spacer.classList.add('elementor-sticky__spacer');
      spacer.setAttribute('aria-hidden', 'true');
      spacer.inert = true;
      spacer.style.visibility = 'hidden';
      let active = false;
      const place = () => {
        const r = spacer.getBoundingClientRect();
        header.style.width = `${r.width}px`;
        header.style.left = `${r.left}px`;
      };
      const update = () => {
        if (!active && header.getBoundingClientRect().top <= offset) {
          header.before(spacer);
          Object.assign(header.style, { position: 'fixed', top: `${offset}px`, zIndex: '99', marginTop: '0' });
          header.classList.add('elementor-sticky--active', 'elementor-sticky--effects');
          active = true;
          place();
        } else if (active && spacer.getBoundingClientRect().top > offset) {
          spacer.remove();
          header.style.cssText = '';
          header.classList.remove('elementor-sticky--active', 'elementor-sticky--effects');
          active = false;
        } else if (active) {
          place();
        }
      };
      window.addEventListener('scroll', update, { passive: true, signal });
      window.addEventListener('resize', update, { signal });
      update();
      cleanups.push(() => {
        spacer.remove();
        header.style.cssText = '';
        header.classList.remove('elementor-sticky--active', 'elementor-sticky--effects');
      });
    }

    // ---- FAQ accordion ------------------------------------------------------------------------
    root.querySelectorAll<HTMLElement>('.elementor-accordion').forEach((accordion) => {
      const setItem = (title: HTMLElement, on: boolean) => {
        const content = document.getElementById(title.getAttribute('aria-controls') ?? '');
        title.classList.toggle('elementor-active', on);
        title.setAttribute('aria-expanded', String(on));
        title.setAttribute('aria-selected', String(on));
        content?.classList.toggle('elementor-active', on);
        if (content) content.style.display = on ? 'block' : 'none';
      };
      accordion.querySelectorAll<HTMLElement>('.elementor-tab-title').forEach((title) => {
        title.tabIndex = 0;
        const flip = () => {
          const on = !title.classList.contains('elementor-active');
          accordion.querySelectorAll<HTMLElement>('.elementor-tab-title.elementor-active').forEach((t) => setItem(t, false));
          if (on) setItem(title, true);
        };
        title.addEventListener('click', flip, { signal });
        onKeyActivate(title, flip);
      });
    });

    // ---- counters -----------------------------------------------------------------------------
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const counters = Array.from(root.querySelectorAll<HTMLElement>('.elementor-counter-number[data-to-value]'));
    if (!reduceMotion && 'IntersectionObserver' in window && counters.length) {
      const io = new IntersectionObserver((entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          io.unobserve(en.target);
          const el = en.target as HTMLElement;
          const from = Number(el.dataset.fromValue ?? 0);
          const to = Number(el.dataset.toValue ?? 0);
          const duration = Number(el.dataset.duration ?? 2000);
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            el.textContent = String(Math.round(from + (to - from) * t));
            if (t < 1 && !signal.aborted) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      }, { threshold: 0.3 });
      counters.forEach((c) => io.observe(c));
      cleanups.push(() => {
        io.disconnect();
        counters.forEach((c) => (c.textContent = c.dataset.toValue ?? c.textContent));
      });
    }

    // ---- hero "Check My Area" card → real ZIP lookup, then booking -----------------------------
    // "Check My Area" checks first: it looks the ZIP up against the real migrated location data
    // (/api/zip-lookup, lib/content/zip-lookup.ts) and shows the matching city or state page — never
    // straight into the generic booking flow, which told a visitor nothing about whether we're even
    // in their area. Booking is still one tap away from the result, so nothing already working here
    // is lost, just no longer the first thing that happens.
    const heroForm = root.querySelector<HTMLFormElement>('#cc-hero-form');
    const heroErr = root.querySelector<HTMLElement>('#cc-hero-err');
    const heroResult = root.querySelector<HTMLElement>('#cc-hero-result');
    const heroSubmit = heroForm?.querySelector<HTMLButtonElement>('.cc-hero-submit');

    const escapeHtml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const openBooking = (service: string, zip: string) => {
      const prefill: BookingPrefill = { zip };
      document.dispatchEvent(
        new CustomEvent('chimcare:open-booking', { detail: { service: serviceFromOption(service), prefill } }),
      );
    };

    const showResult = (html: string) => {
      if (!heroResult || !heroForm) return;
      heroResult.innerHTML = html;
      heroResult.hidden = false;
      heroForm.hidden = true;
      heroResult.querySelector<HTMLButtonElement>('[data-hero-again]')?.addEventListener(
        'click',
        () => {
          heroResult.hidden = true;
          heroResult.innerHTML = '';
          heroForm.hidden = false;
          heroForm.querySelector<HTMLInputElement>('#cc-hero-zip')?.focus();
        },
        { signal },
      );
      heroResult.querySelector<HTMLButtonElement>('[data-hero-book]')?.addEventListener(
        'click',
        (e) => {
          const service = (e.currentTarget as HTMLElement).dataset.heroBook ?? '';
          const zip = (e.currentTarget as HTMLElement).dataset.heroZip ?? '';
          openBooking(service, zip);
        },
        { signal },
      );
      // The out-of-area request form. Posting it stores a lead (site.leads) rather than a booking;
      // the server re-checks the ZIP, so if it turns out we do cover it, this opens booking instead
      // of selling a real customer on.
      const leadForm = heroResult.querySelector<HTMLFormElement>('form[data-hero-lead]');
      leadForm?.addEventListener(
        'submit',
        (e) => {
          e.preventDefault();
          const data = new FormData(leadForm);
          const val = (k: string) => String(data.get(k) ?? '').trim();
          const service = leadForm.dataset.heroService ?? '';
          const zip = leadForm.dataset.heroZip ?? '';
          const submit = leadForm.querySelector<HTMLButtonElement>('.cc-hero-lead-submit');
          const err = leadForm.querySelector<HTMLElement>('[data-hero-lead-err]');
          const fail = (m: string) => {
            if (err) err.textContent = m;
            submit?.removeAttribute('disabled');
            leadForm.classList.remove('is-loading');
          };
          if (err) err.textContent = '';
          submit?.setAttribute('disabled', 'true');
          leadForm.classList.add('is-loading');
          fetch('/api/leads/', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              name: val('name'),
              phone: val('phone'),
              email: val('email'),
              zip,
              message: val('message'),
              service: serviceFromOption(service),
              serviceLabel: service,
              pageKind: 'hub',
              pageSlug: '/',
            }),
            signal: withTimeout(10000),
          })
            .then((r) => r.json().then((body: Record<string, unknown>) => ({ ok: r.ok, body })))
            .then(({ ok, body }) => {
              if (!ok || body.ok === false) {
                const errors = body.errors as Record<string, string> | undefined;
                const first = errors ? Object.values(errors)[0] : undefined;
                fail(first ?? 'We could not send that just now. Please try again.');
                return;
              }
              if (body.served) {
                // We cover this ZIP after all: book it, do not sell it.
                openBooking(service, zip);
                return;
              }
              const firstName = val('name').split(' ')[0];
              // Echo the number back the way it would be read aloud, not as the ten digits a phone
              // keypad produces.
              const digits = val('phone').replace(/\D/g, '');
              const shownPhone = digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : val('phone');
              showResult(`
                <p class="cc-hero-result-head">Thank you${firstName ? `, ${escapeHtml(firstName)}` : ''}. We&rsquo;ll get back to you soon.</p>
                <p class="cc-hero-result-sub">We have your request${body.reference ? ` (reference <b>${escapeHtml(String(body.reference))}</b>)` : ''} and we&rsquo;ll be in touch at ${escapeHtml(shownPhone)}.</p>
                <button type="button" class="cc-hero-result-again" data-hero-again>Send another request</button>
              `);
            })
            .catch((error: unknown) => {
              if (signal.aborted) return;
              console.warn('[hero] lead submit failed', error);
              fail('We could not send that just now. Please try again.');
            });
        },
        { signal },
      );
    };

    const zipEl = heroForm?.querySelector<HTMLInputElement>('#cc-hero-zip') ?? null;
    const serviceEl = heroForm?.querySelector<HTMLSelectElement>('#cc-hero-service') ?? null;
    const heroNote = root.querySelector<HTMLElement>('#cc-hero-note');
    const locateBtn = root.querySelector<HTMLButtonElement>('#cc-hero-locate');

    const setError = (message: string, field?: HTMLInputElement | HTMLSelectElement | null) => {
      if (heroErr) heroErr.textContent = message;
      [zipEl, serviceEl].forEach((el) => el?.removeAttribute('aria-invalid'));
      if (field) {
        field.setAttribute('aria-invalid', 'true');
        field.focus();
      }
    };
    const setNote = (message: string) => {
      if (heroNote) heroNote.textContent = message;
    };
    const place = (city: string | null, stateCode: string | null) =>
      city ? `${city}${stateCode ? `, ${stateCode}` : ''}` : null;

    // Auto-detect, no prompt: the ZIP the visitor's connection comes from (lib/content/locate.ts). Filled in
    // only while the field is still empty and untouched, and labelled as a guess they can change.
    let zipTouched = false;
    if (zipEl && !zipEl.value) {
      fetch('/api/locate/', { signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { ok: boolean; zip?: string; city?: string | null; stateCode?: string | null } | null) => {
          if (!data?.ok || !data.zip || zipTouched || zipEl.value) return;
          zipEl.value = data.zip;
          const where = place(data.city ?? null, data.stateCode ?? null);
          setNote(`${where ? `Near ${where}? ` : ''}ZIP filled in from your connection. Change it if it's not right, or tap the target for your exact location.`);
        })
        .catch(() => { /* no guess: the field just stays empty */ });
    }

    // "Use my current location": the device's own position → ZIP. Every way it can fail says what to do next.
    const GEO_ERRORS: Record<number, string> = {
      1: 'Location access is blocked. Allow it for this site in your browser settings, or type your ZIP.',
      2: 'We couldn\u2019t find your location right now. Please type your ZIP code.',
      3: 'Finding your location took too long. Try again, or type your ZIP code.',
    };
    const locate = () => {
      if (!zipEl || !locateBtn || locateBtn.classList.contains('is-busy')) return;
      if (!('geolocation' in navigator)) {
        setError('This browser can\u2019t share your location. Please type your ZIP code.', zipEl);
        return;
      }
      if (!window.isSecureContext) {
        setError('Location only works over a secure (https) connection. Please type your ZIP code.', zipEl);
        return;
      }
      if (!navigator.onLine) {
        setError('You appear to be offline. Check your connection, or type your ZIP code.', zipEl);
        return;
      }
      setError('');
      setNote('Finding your location\u2026');
      locateBtn.classList.add('is-busy');
      locateBtn.setAttribute('aria-busy', 'true');
      const done = () => {
        locateBtn.classList.remove('is-busy');
        locateBtn.removeAttribute('aria-busy');
      };
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          fetch(`/api/locate/?lat=${latitude.toFixed(5)}&lng=${longitude.toFixed(5)}`, { signal: withTimeout(8000) })
            .then((r) => r.json())
            .then((data: { ok: boolean; zip?: string; city?: string | null; stateCode?: string | null; error?: string }) => {
              if (data.ok && data.zip) {
                zipTouched = true;
                zipEl.value = data.zip;
                const where = place(data.city ?? null, data.stateCode ?? null);
                setNote(`Found ${where ? `${where}, ` : ''}ZIP ${data.zip}.`);
                // With a service already chosen, go straight on to the check.
                if (serviceEl?.value) heroForm?.requestSubmit();
                else setError('Now select a service.', serviceEl);
                return;
              }
              setNote('');
              setError(
                data.error === 'outside-us'
                  ? 'Your location looks to be outside the US, and Chimcare serves US homes only. Type a US ZIP to check an address.'
                  : data.error === 'not-found'
                    ? 'We couldn\u2019t match your location to a ZIP code. Please type it in.'
                    : 'We couldn\u2019t look up your ZIP just now. Please type it in.',
                zipEl,
              );
            })
            .catch(() => {
              if (signal.aborted) return;
              setNote('');
              setError('We couldn\u2019t look up your ZIP just now. Please type it in.', zipEl);
            })
            .finally(done);
        },
        (err) => {
          done();
          setNote('');
          setError(GEO_ERRORS[err.code] ?? GEO_ERRORS[2], zipEl);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
      );
    };
    locateBtn?.addEventListener('click', locate, { signal });

    // Digits only, as they type (a pasted "55124-1234" keeps its first five).
    zipEl?.addEventListener('input', () => {
      zipTouched = true;
      const digits = zipEl.value.replace(/\D/g, '').slice(0, 5);
      if (digits !== zipEl.value) zipEl.value = digits;
      setNote('');
    }, { signal });

    // Gives up after `ms` as well as on unmount. AbortSignal.any is Safari 17.4+; older iPhones get unmount only.
    const withTimeout = (ms: number): AbortSignal =>
      typeof AbortSignal.any === 'function' && typeof AbortSignal.timeout === 'function' ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : signal;

    const lookupFailed = (option: string, zip: string) =>
      showResult(`
        <p class="cc-hero-result-head">We couldn&rsquo;t check that ZIP just now.</p>
        <p class="cc-hero-result-sub">${navigator.onLine ? 'Our lookup is having trouble.' : 'You appear to be offline.'} You can still book, or call and we&rsquo;ll confirm your area.</p>
        <a class="cc-hero-result-cta" href="tel:8888552889">Call (888) 855-2889</a>
        <button type="button" class="cc-hero-result-book" data-hero-book="${escapeHtml(option)}" data-hero-zip="${escapeHtml(zip)}">Continue to Online Booking</button>
        <button type="button" class="cc-hero-result-again" data-hero-again>Try again</button>
      `);

    heroForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const option = serviceEl?.value ?? '';
      const zip = zipEl?.value.trim() ?? '';
      if (!option) {
        setError('Select a service to continue.', serviceEl);
        return;
      }
      if (!zip) {
        setError('Enter your ZIP code, or tap the target to use your location.', zipEl);
        return;
      }
      if (!/^\d{5}$/.test(zip)) {
        setError('A ZIP code is 5 digits, like 55124.', zipEl);
        return;
      }
      if (zip === '00000') {
        setError('That isn\u2019t a valid ZIP code. Please check it.', zipEl);
        return;
      }
      setError('');

      heroSubmit?.setAttribute('disabled', 'true');
      heroForm.classList.add('is-loading');
      fetch(`/api/zip-lookup/?zip=${encodeURIComponent(zip)}`, { signal: withTimeout(8000) })
        .then((r) => {
          if (!r.ok) throw new Error(`zip-lookup ${r.status}`);
          return r.json();
        })
        .then((data: { match: 'city' | 'state' | 'none'; cityName?: string; stateCode?: string; stateName?: string; href?: string; addressLine?: string | null; usZip?: boolean; zipCity?: string; zipState?: string }) => {
          // Not a US ZIP. Keep the form up and point at the field, rather than showing the request
          // panel for a place that does not exist — the server would refuse it on submit anyway.
          if (data.usZip === false) {
            setError('That isn\u2019t a US ZIP code. We serve the United States only.', zipEl);
            return;
          }
          const svc = escapeHtml(option);
          if (data.match === 'city' && data.href && data.cityName) {
            showResult(`
              <p class="cc-hero-result-head">Good news! We serve ${escapeHtml(data.cityName)}${data.stateCode ? `, ${escapeHtml(data.stateCode)}` : ''}!</p>
              ${data.addressLine ? `<p class="cc-hero-result-sub">${escapeHtml(data.addressLine)}</p>` : ''}
              <a class="cc-hero-result-cta" href="${escapeHtml(data.href)}">View This Location</a>
              <button type="button" class="cc-hero-result-book" data-hero-book="${svc}" data-hero-zip="${escapeHtml(zip)}">Continue to Online Booking</button>
              <button type="button" class="cc-hero-result-again" data-hero-again>Search another ZIP</button>
            `);
          } else if (data.match === 'state' && data.href && data.stateName) {
            showResult(`
              <p class="cc-hero-result-head">We proudly serve ${escapeHtml(data.stateName)}!</p>
              <p class="cc-hero-result-sub">See every city we cover in your state.</p>
              <a class="cc-hero-result-cta" href="${escapeHtml(data.href)}">View ${escapeHtml(data.stateName)} Locations</a>
              <button type="button" class="cc-hero-result-book" data-hero-book="${svc}" data-hero-zip="${escapeHtml(zip)}">Continue to Online Booking</button>
              <button type="button" class="cc-hero-result-again" data-hero-again>Search another ZIP</button>
            `);
          } else {
            // The visitor is told nothing about coverage. This panel is deliberately the same
            // offer, in the same voice, as the served result above it: a request that goes through
            // and gets answered. The difference is entirely server-side — /api/leads stores it in
            // site.leads instead of site.bookings — and surfacing it here would turn a saleable
            // lead away at the door, which is exactly what the old "give us a call" copy did.
            //
            // Do not reintroduce "we don't cover", "not in your area", or a phone number as the
            // primary action here. It says "we can help in X", never "we serve X": the request is
            // genuinely answered, but claiming a branch in a town with none is a different thing.
            const where = data.zipCity
              ? `${escapeHtml(data.zipCity)}${data.zipState ? `, ${escapeHtml(data.zipState)}` : ''}`
              : 'your area';
            showResult(`
              <p class="cc-hero-result-head">Good news, we can help in ${where}!</p>
              <p class="cc-hero-result-sub">Tell us how to reach you and we&rsquo;ll get back to you soon.</p>
              <form class="cc-hero-lead" data-hero-lead data-hero-zip="${escapeHtml(zip)}" data-hero-service="${svc}">
                <input name="name" type="text" placeholder="Name*" aria-label="Name" required autocomplete="name">
                <input name="phone" type="tel" placeholder="Phone*" aria-label="Phone" required autocomplete="tel">
                <input name="email" type="email" placeholder="Email*" aria-label="Email" required autocomplete="email">
                <textarea name="message" rows="2" placeholder="What do you need? (optional)" aria-label="What do you need"></textarea>
                <p class="cc-hero-lead-err" data-hero-lead-err role="alert" aria-live="polite"></p>
                <button type="submit" class="cc-hero-result-cta cc-hero-lead-submit">Send My Request</button>
              </form>
              <button type="button" class="cc-hero-result-again" data-hero-again>Search another ZIP</button>
            `);
          }
        })
        .catch((err: unknown) => {
          if (signal.aborted) return;
          // Network down, timeout or a server error: say so, and keep booking and calling one tap away.
          console.warn('[hero] ZIP lookup failed', err);
          lookupFailed(option, zip);
        })
        .finally(() => {
          heroSubmit?.removeAttribute('disabled');
          heroForm.classList.remove('is-loading');
        });
    }, { signal });
    heroForm?.querySelectorAll('select, input').forEach((el) => {
      el.addEventListener('input', () => setError(''), { signal });
      el.addEventListener('change', () => setError(''), { signal });
    });

    // ---- testimonials slider (phones) ---------------------------------------------------------
    // overrides.css turns the three cards into a horizontal snap track below 768px; this adds the dots and
    // advances one review every few seconds. It pauses while the visitor touches or focuses it, while it is
    // off screen or the tab is hidden, and never auto-advances under prefers-reduced-motion.
    const track = root.querySelector<HTMLElement>('.elementor-element-92bd501 > .elementor-container');
    const slides = track ? Array.from(track.children).filter((c) => c.classList.contains('elementor-column')) : [];
    if (track && slides.length > 1) {
      const phone = window.matchMedia('(max-width: 767px)');
      const dots = document.createElement('div');
      dots.className = 'cc-testi-dots';
      dots.setAttribute('role', 'group');
      dots.setAttribute('aria-label', 'Choose a review');
      const current = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      const go = (i: number) => track.scrollTo({ left: i * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
      const buttons = slides.map((_, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', `Show review ${i + 1} of ${slides.length}`);
        b.addEventListener('click', () => {
          go(i);
          start();
        }, { signal });
        dots.append(b);
        return b;
      });
      track.after(dots);
      const mark = () => {
        const i = current();
        buttons.forEach((b, n) => b.setAttribute('aria-current', String(n === i)));
      };
      let frame = 0;
      track.addEventListener('scroll', () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(mark);
      }, { passive: true, signal });
      mark();

      let timer: number | undefined;
      let held = false;
      let onScreen = false;
      const stop = () => {
        window.clearInterval(timer);
        timer = undefined;
      };
      const start = () => {
        stop();
        if (!phone.matches || reduceMotion || held || !onScreen || document.hidden) return;
        timer = window.setInterval(() => go((current() + 1) % slides.length), 4500);
      };
      const hold = (on: boolean) => () => {
        held = on;
        start();
      };
      track.addEventListener('pointerdown', hold(true), { signal });
      track.addEventListener('pointerup', hold(false), { signal });
      track.addEventListener('pointercancel', hold(false), { signal });
      root.querySelector('.elementor-element-3ec657d')?.addEventListener('focusin', hold(true), { signal });
      root.querySelector('.elementor-element-3ec657d')?.addEventListener('focusout', hold(false), { signal });
      document.addEventListener('visibilitychange', start, { signal });
      phone.addEventListener('change', () => {
        if (!phone.matches) track.scrollLeft = 0;
        start();
      }, { signal });
      const seen = new IntersectionObserver(([en]) => {
        onScreen = en.isIntersecting;
        start();
      }, { threshold: 0.5 });
      seen.observe(track);
      cleanups.push(() => {
        stop();
        seen.disconnect();
        dots.remove();
      });
    }

    // ---- US map tooltip -----------------------------------------------------------------------
    // Shared with the About page's copy of the map (components/islands/usaMapTip.ts).
    const map = root.querySelector<HTMLElement>('.cc-usmap');
    const tip = map?.querySelector<HTMLElement>('.cc-tip');
    if (map && tip) attachUsaMapTooltip(map, tip, signal);

    // ---- location search → locations hub ------------------------------------------------------
    root.querySelectorAll<HTMLFormElement>('.e-search-form').forEach((search) => {
      search.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = search.querySelector<HTMLInputElement>('input[name="s"]')?.value.trim() ?? '';
        window.location.assign(q ? `/locations/?q=${encodeURIComponent(q)}` : '/locations/');
      }, { signal });
    });

    // ---- newsletter ---------------------------------------------------------------------------
    // Production posts this to an empty URL and always fails; there is no subscription backend here either.
    // Stop the native submit reloading the page, and say plainly that sign-up is unavailable.
    const newsletter = root.querySelector<HTMLFormElement>('#newsletterForm');
    newsletter?.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = root.querySelector<HTMLElement>('#formMessage');
      if (msg) {
        msg.className = 'newsletter-message error';
        msg.textContent = 'Newsletter sign-up is not available yet. Please call us or use Contact Us.';
      }
    }, { signal });

    return () => {
      ac.abort();
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
