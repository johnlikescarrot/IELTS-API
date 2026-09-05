/** Shared HTML escaping for documentation and the scholarly report. */

/**
 * Escape text for safe inclusion in HTML.
 *
 * @param value - Raw text.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
