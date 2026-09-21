'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The ZIP result popup — "Option A", the classic centred modal from the client's mock.
 *
 * It opens on `chimcare:zip-result`, which components/islands/HomeBehaviour.tsx dispatches once the
 * hero's ZIP check comes back. It is deliberately **the same modal for every ZIP we accept**: the
 * headline, the fields and the confirmation do not change between a town we cover and one we do
 * not. The difference lives entirely in POST /api/requests, which decides from the ZIP whether the
 * row becomes a booking or a saleable lead, and whose reply does not say which.
 *
 * A ZIP that is not a US ZIP never gets here — the hero keeps its own form up and marks the field,
 * because there is nothing to request for a place that does not exist.
 */

export type ZipResultDetail = {
  zip: string;
  /** "Minneapolis, MN" when the ZIP directory could name the town, otherwise null. */
  place: string | null;
  /** The hero's service select, e.g. "$299 Chimney Sweep + Inspection". */
  serviceLabel?: string;
  /** The catalogue key behind it, when one matched. */
  service?: string;
};

type Errors = Partial<Record<'name' | 'phone' | 'email' | 'zip' | 'form', string>>;

const RULES = {
  name: (v: string) => (v.trim().length >= 2 ? null : 'Enter your name.'),
  phone: (v: string) => (v.replace(/\D/g, '').length === 10 ? null : 'Enter a 10-digit phone number.'),
  email: (v: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : 'Enter an email like name@example.com.'),
};

/** (555) 555-5555 as they type. A pasted +1 or a 11-digit number keeps its last ten. */
function formatPhone(v: string): string {
  let d = v.replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])';

export function ZipRequestModal() {
  const [detail, setDetail] = useState<ZipResultDetail | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ first: string } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [phone, setPhone] = useState('');

  const card = useRef<HTMLDivElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const open = detail !== null;
  const place = detail?.place ?? 'your area';

  const close = useCallback(() => {
    setDetail(null);
    setDone(null);
    setErrors({});
    setPhone('');
    setSending(false);
    opener.current?.focus({ preventScroll: true });
  }, []);

  // Opened by the hero's ZIP check.
  useEffect(() => {
    const onResult = (e: Event) => {
      const d = (e as CustomEvent<ZipResultDetail>).detail;
      if (!d?.zip) return;
      opener.current = document.activeElement as HTMLElement | null;
      setDone(null);
      setErrors({});
      setPhone('');
      setSending(false);
      setDetail(d);
    };
    document.addEventListener('chimcare:zip-result', onResult);
    return () => document.removeEventListener('chimcare:zip-result', onResult);
  }, []);

  // Escape, focus trap, and a page that does not scroll behind the scrim.
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      (done ? doneRef.current : firstField.current)?.focus({ preventScroll: true });
    }, 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab' || !card.current) return;
      const items = [...card.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === card.current)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, done, close]);

  /** Hands the visitor back to the hero with the ZIP field empty and focused. */
  const searchAnother = () => {
    close();
    const zip = document.getElementById('cc-hero-zip') as HTMLInputElement | null;
    // Belt and braces: the hero form is not hidden while the modal is open, but an older build did
    // hide it, and a stale `hidden` here would leave the card empty.
    const form = document.getElementById('cc-hero-form');
    if (form) form.hidden = false;
    if (zip) { zip.value = ''; zip.focus(); }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!detail) return;
    const data = new FormData(e.currentTarget);
    const val = (k: string) => String(data.get(k) ?? '').trim();
    const next: Errors = {};
    for (const key of ['name', 'phone', 'email'] as const) {
      const msg = RULES[key](val(key));
      if (msg) next[key] = msg;
    }
    setErrors(next);
    if (Object.keys(next).length) {
      card.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/requests/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: val('name'), phone: val('phone'), email: val('email'), message: val('message'),
          zip: detail.zip, service: detail.service, serviceLabel: detail.serviceLabel,
          pageKind: 'hub', pageSlug: '/',
        }),
      });
      const body = (await res.json()) as { ok?: boolean; reference?: string; errors?: Errors };
      if (!res.ok || !body.ok) {
        setErrors(body.errors ?? { form: 'We could not send that just now. Please try again.' });
        setSending(false);
        return;
      }
      setDone({ first: val('name').split(/\s+/)[0] || '' });
    } catch {
      setErrors({ form: 'We could not send that just now. Please try again.' });
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const requestPhrase = detail?.serviceLabel
    ? `your ${detail.serviceLabel.replace(/^\$\d+\s*/, '').toLowerCase()} request`
    : 'your request';

  return (
    <div className="zipm" role="presentation">
      <div className="zipm-scrim" onClick={close} />
      <section
        className="zipm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="zipm-title"
        ref={card}
        tabIndex={-1}
      >
        <button type="button" className="zipm-x" aria-label="Close" onClick={close}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        {done ? (
          <div className="zipm-done" ref={doneRef} tabIndex={-1}>
            <svg className="zipm-mark" viewBox="0 0 56 56" aria-hidden="true">
              <circle cx="28" cy="28" r="25" />
              <path d="m17 29 8 8 15-17" />
            </svg>
            <h2 id="zipm-title">Request sent.</h2>
            <p>
              Thanks, {done.first || 'there'}. We&rsquo;ll get back to you soon about {requestPhrase} in {place}.
            </p>
            <button type="button" className="zipm-cta" onClick={close}>Done</button>
          </div>
        ) : (
          <>
            <div className="zipm-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <h2 id="zipm-title">Good news, we can help in {place}!</h2>
            <p className="zipm-sub">Tell us how to reach you and we&rsquo;ll get back to you soon.</p>

            <form className="zipm-form" onSubmit={onSubmit} noValidate>
              <Field id="zipm-name" name="name" label="Name*" error={errors.name} inputRef={firstField} autoComplete="name" />
              <Field
                id="zipm-phone" name="phone" label="Phone*" error={errors.phone} type="tel"
                autoComplete="tel" inputMode="tel" value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
              />
              <Field id="zipm-email" name="email" label="Email*" error={errors.email} type="email" autoComplete="email" />
              <div className="zipm-field">
                <textarea id="zipm-msg" name="message" placeholder=" " rows={2} />
                <label htmlFor="zipm-msg">What do you need? (optional)</label>
              </div>
              {errors.zip ? <p className="zipm-err" role="alert">{errors.zip}</p> : null}
              {errors.form ? <p className="zipm-err" role="alert">{errors.form}</p> : null}
              <button type="submit" className="zipm-cta" aria-busy={sending || undefined} disabled={sending}>
                <span>{sending ? 'Sending…' : 'Send My Request'}</span>
                {sending ? <span className="zipm-spin" aria-hidden="true" /> : null}
              </button>
            </form>

            <p className="zipm-foot">
              Not <b>{detail?.zip}</b>?{' '}
              <button type="button" className="zipm-link" onClick={searchAnother}>Search another ZIP</button>
            </p>
            <p className="zipm-trust">78,000+ Happy Clients &middot; Since 1989</p>
          </>
        )}
      </section>
    </div>
  );
}

/** A floating-label field, the shape the mock's Option A uses. `placeholder=" "` drives the float. */
function Field({
  id, name, label, error, type = 'text', inputRef, ...rest
}: {
  id: string; name: string; label: string; error?: string; type?: string;
  inputRef?: React.Ref<HTMLInputElement>;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`zipm-field${error ? ' has-err' : ''}`}>
      <input
        id={id} name={name} type={type} placeholder=" " ref={inputRef}
        aria-required="true" aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        {...rest}
      />
      <label htmlFor={id}>{label}</label>
      {error ? <p className="zipm-err" id={`${id}-err`} role="alert">{error}</p> : null}
    </div>
  );
}
