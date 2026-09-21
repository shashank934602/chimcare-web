// Crockford-style alphabet: no I, O, 0 or 1, so a reference read down a phone line is unambiguous.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A customer-facing reference, e.g. `CHM-7F3K2Q` for a booking or `CHM-L-7F3K2Q` for a lead. */
export function reference(prefix = 'CHM'): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `${prefix}-${s}`;
}
