'use client';

import { useState } from 'react';
import { Icon } from '@/components/chrome/Icon';

/** The "Send Us a Message" form. Validates client-side per field, then again on the server
 *  (lib/contact/validate.ts) before the message is stored — the same split BookingForm uses. */
export function ContactForm({ pageSlug }: { pageSlug: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      message: String(data.get('message') ?? ''),
      pageSlug,
    };
    setStatus('sending');
    setErrors({});
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok: boolean; errors?: Record<string, string> };
      if (!res.ok || !json.ok) {
        setErrors(json.errors ?? { form: 'Something went wrong. Please try again.' });
        setStatus('idle');
        return;
      }
      form.reset();
      setStatus('sent');
    } catch {
      setErrors({ form: 'Something went wrong. Please try again.' });
      setStatus('idle');
    }
  };

  if (status === 'sent') {
    return (
      <div className="contact-form-done" role="status">
        <span className="tick">
          <Icon name="check" />
        </span>
        <h3>Message sent</h3>
        <p>Thanks for reaching out — our team will get back to you shortly.</p>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatus('idle')}>
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      <label className="cf-field">
        <span className="sr-only">Name</span>
        <input name="name" type="text" placeholder="Name" aria-label="Name" required autoComplete="name" aria-invalid={!!errors.name} />
        {errors.name && <em className="cf-err">{errors.name}</em>}
      </label>
      <label className="cf-field">
        <span className="sr-only">Email</span>
        <input name="email" type="email" placeholder="Email" aria-label="Email" required autoComplete="email" aria-invalid={!!errors.email} />
        {errors.email && <em className="cf-err">{errors.email}</em>}
      </label>
      <label className="cf-field">
        <span className="sr-only">Message</span>
        <textarea name="message" placeholder="Message" aria-label="Message" required rows={5} aria-invalid={!!errors.message} />
        {errors.message && <em className="cf-err">{errors.message}</em>}
      </label>
      {errors.form && <p className="cf-err cf-err-form">{errors.form}</p>}
      <button className="btn btn-primary cf-submit" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Submit'}
      </button>
    </form>
  );
}
