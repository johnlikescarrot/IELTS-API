/**
 * HTML escaping and tag helpers shared by every page the service renders.
 *
 * Kept separate from the documentation page so that the paper landing page can
 * reuse it without pulling the datasets into its import graph.
 */

/**
 * Escape text for safe inclusion in HTML text content or in an attribute.
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

/**
 * Render a `<meta name="..." content="...">` tag with both values escaped.
 *
 * Google Scholar reads tag values as HTML attributes, so a title containing a
 * quotation mark must be escaped or the record is silently truncated.
 *
 * @param name - Tag name.
 * @param content - Tag value.
 */
export function metaTag(name: string, content: string): string {
  return `<meta name="${escapeHtml(name)}" content="${escapeHtml(content)}">`;
}

/**
 * Render a `<meta property="..." content="...">` tag, as Open Graph wants.
 *
 * @param property - Property name.
 * @param content - Property value.
 */
export function metaProperty(property: string, content: string): string {
  return `<meta property="${escapeHtml(property)}" content="${escapeHtml(content)}">`;
}

/**
 * Serialise a value as the body of a JSON-LD `<script>` element.
 *
 * HTML escaping must not be used here: it would corrupt the JSON. The correct
 * mitigation is to escape the three characters that let a payload break out of
 * the script element as JSON `\u` escapes, which every JSON parser resolves
 * back to the original text while the HTML tokeniser never sees a closing tag.
 *
 * @param value - Value to serialise.
 * @returns Pretty-printed JSON safe to embed in an HTML document.
 */
export function jsonLdBody(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
