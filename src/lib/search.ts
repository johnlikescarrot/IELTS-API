/** Lowercase a string and split it into whitespace-separated tokens. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/u)
    .filter((token) => token.length > 0);
}

/**
 * Case-insensitive "all words must appear" search: every token of the query
 * must appear in at least one of the fields. Searching "urban environment"
 * only matches entries containing both words somewhere.
 */
export function matchesAllTokens(fields: readonly string[], query: string): boolean {
  const tokens = tokenize(query);
  const haystack = fields.map((field) => field.toLowerCase());
  return tokens.every((token) => haystack.some((field) => field.includes(token)));
}
