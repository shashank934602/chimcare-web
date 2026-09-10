/**
 * Folds a town name or a search query into a comparable form, so the punctuation and abbreviation
 * a visitor happens to type does not decide whether they find their town.
 *
 * WordPress spells it "St. Paul". People type "St Paul" and "Saint Paul" just as often, and a raw
 * substring match finds none of them. This affects matching only — the name shown on a card is
 * always the source spelling, unchanged.
 *
 * Shared by the server (which counts matches for the hero) and the client island (which filters the
 * grid), so the two can never disagree about what matches.
 */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\bsaint\b/g, 'st')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** How many of these searchable strings match the query. */
export function countMatches(haystacks: string[], query: string): number {
  const needle = fold(query);
  if (!needle) return haystacks.length;
  return haystacks.filter((h) => fold(h).includes(needle)).length;
}
