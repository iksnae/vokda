/**
 * Normalizes arbitrary text for downstream synthesis processing.
 *
 * Collapses all whitespace runs (spaces, tabs, newlines, etc.) into a single
 * space, then trims leading and trailing whitespace.  Returns an empty string
 * for inputs that are empty or consist solely of whitespace.
 *
 * ## Summary
 *
 * 1. Replace every run of one or more whitespace characters (`/\s+/g`) with a
 *    single space character.
 * 2. Trim leading and trailing whitespace from the result.
 * 3. Return `""` when the normalised string is empty (i.e. the original input
 *    was empty or whitespace-only).
 *
 * ## Guarantees
 *
 * - The function is **pure**: no side effects, no imports, no module-level
 *   mutable state.
 * - The return value contains no leading or trailing whitespace.
 * - The return value contains no consecutive whitespace characters.
 *
 * @param text - The raw text to normalise.
 * @returns A normalised, single-space-separated string, or `""` for
 *          empty/whitespace-only input.
 *
 * @example
 *   normalizeText('Hello   world')  // 'Hello world'
 *   normalizeText('  spaced  ')     // 'spaced'
 *   normalizeText('\t\n  a b\n')    // 'a b'
 *   normalizeText('')               // ''
 *   normalizeText('   ')            // ''
 */
export function normalizeText(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  return collapsed;
}
