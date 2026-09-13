'use client';

import { SEARCH_ENABLED } from '@/lib/content/search';

/**
 * The state hub has two search boxes — one in the hero, one above the directory grid — and they
 * must always agree. They sit far apart in the template, so instead of threading React state
 * through the server components between them they share this tiny store.
 *
 * Typing filters instantly. The URL is updated separately, on a debounce, so a search can still be
 * linked and shared without a server round-trip on every keystroke.
 */

let query: string | null = null;
const listeners = new Set<() => void>();

/** Seed the store from the URL on first render, so a shared link filters immediately. */
export function ensureQuery(initial: string): void {
  if (query === null) query = SEARCH_ENABLED ? initial : '';
}

export function getQuery(): string {
  return query ?? '';
}

export function setQuery(next: string): void {
  if (!SEARCH_ENABLED || query === next) return;
  query = next;
  for (const l of listeners) l();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Reflect the query in the address bar without asking Next.js to re-render the route. A soft
 * navigation per keystroke would be a server round-trip and would fight the input for focus.
 */
export function syncUrl(basePath: string, next: string): void {
  if (!SEARCH_ENABLED) return;
  const url = next.trim() ? `${basePath}?q=${encodeURIComponent(next.trim())}` : basePath;
  window.history.replaceState(null, '', url);
}
