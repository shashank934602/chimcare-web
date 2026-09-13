'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from '@/components/chrome/Icon';
import { fold, SEARCH_DISABLED_NOTE, SEARCH_ENABLED } from '@/lib/content/search';
import { ensureQuery, getQuery, setQuery, subscribe, syncUrl } from './locationSearch';

/**
 * The hero "find your town" field.
 *
 * Filtering happens as you type — the directory below updates on every keystroke through the shared
 * store. The URL is updated on a short debounce so a search stays shareable and survives a reload,
 * without a server round-trip per character.
 *
 * The form still works with JavaScript disabled: it is a real GET form, and the server renders the
 * filtered directory from `?q=`.
 */
export function HeroSearch({
  action,
  initialQuery,
  searchIndex,
  totalCount,
  stateName,
}: {
  action: string;
  initialQuery: string;
  searchIndex: string[];
  totalCount: number;
  stateName: string;
}) {
  const seed = SEARCH_ENABLED ? initialQuery : '';
  ensureQuery(seed);
  const query = useSyncExternalStore(subscribe, getQuery, () => seed);
  // Search is off: the first click, tap or Enter explains why nothing happens.
  const [notice, setNotice] = useState(false);
  const explain = SEARCH_ENABLED ? undefined : () => setNotice(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const folded = useMemo(() => searchIndex.map(fold), [searchIndex]);
  const needle = fold(query);
  const matchCount = needle ? folded.filter((h) => h.includes(needle)).length : totalCount;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onChange = (next: string) => {
    setQuery(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => syncUrl(action, next), 400);
  };

  const clear = () => {
    setQuery('');
    if (timer.current) clearTimeout(timer.current);
    syncUrl(action, '');
  };

  return (
    <div className="hero-search" id="finder">
      <form
        className="searchbar"
        action={action}
        method="get"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (!SEARCH_ENABLED) return setNotice(true);
          document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      >
        <Icon name="search" />
        <input
          id="f-q"
          name="q"
          type="search"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          readOnly={!SEARCH_ENABLED}
          onFocus={explain}
          onClick={explain}
          placeholder={`Search ${stateName} locations by town`}
          autoComplete="off"
          spellCheck={false}
          aria-label={`Search Chimcare locations in ${stateName}`}
        />
        <button type="submit" className="searchbar-go" aria-label="Go to results">
          <Icon name="arrow" />
        </button>
      </form>
      <p className="finder-note" id="finder-note" role="status" aria-live="polite">
        <Icon name="pin" />
        {notice ? (
          <span>{SEARCH_DISABLED_NOTE}</span>
        ) : needle ? (
          <span>
            Showing <b>{matchCount} of {totalCount}</b> {stateName} locations matching “{query.trim()}”.{' '}
            <button type="button" className="linkish" onClick={clear}>Show all</button>
          </span>
        ) : (
          <span>Showing <b>all {totalCount} {stateName} locations</b>.</span>
        )}
      </p>
    </div>
  );
}
