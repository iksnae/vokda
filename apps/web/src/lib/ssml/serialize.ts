/**
 * SSML serialization helpers.
 *
 * - wrapSpeak: ensure <speak> root
 * - insertTag: insert/wrap a tag at cursor/selection
 */

import type { SsmlTagDef } from './tags';

/** Ensure SSML string has a <speak> wrapper. */
export function wrapSpeak(inner: string): string {
  const trimmed = inner.trim();
  if (trimmed.startsWith('<speak') && trimmed.endsWith('</speak>')) {
    return trimmed;
  }
  return `<speak>${inner}</speak>`;
}

/**
 * Insert an SSML tag into source text at the given cursor/selection range.
 *
 * For self-closing tags: replaces selection with `<tag attrs/>`
 * For wrapping tags: wraps selection with `<tag attrs>selection</tag>`
 *
 * Returns the new text and cursor position (placed inside the tag for wrapping,
 * after the tag for self-closing).
 */
export function insertTag(
  source: string,
  selStart: number,
  selEnd: number,
  tag: SsmlTagDef,
  attrs: Record<string, string>
): { text: string; cursorPos: number } {
  const attrStr = buildAttrString(attrs);
  const before = source.slice(0, selStart);
  const selected = source.slice(selStart, selEnd);
  const after = source.slice(selEnd);

  if (tag.selfClosing) {
    const tagStr = `<${tag.tag}${attrStr}/>`;
    const text = before + tagStr + after;
    return { text, cursorPos: before.length + tagStr.length };
  }

  // Wrapping tag
  const openTag = `<${tag.tag}${attrStr}>`;
  const closeTag = `</${tag.tag}>`;
  const text = before + openTag + selected + closeTag + after;
  const cursorPos = before.length + openTag.length + selected.length;

  // If no selection, place cursor between open and close tags
  if (selStart === selEnd) {
    return { text, cursorPos: before.length + openTag.length };
  }

  return { text, cursorPos };
}

/** Build the attribute string from a key-value map, omitting empty values. */
function buildAttrString(attrs: Record<string, string>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (value) {
      parts.push(`${key}="${value}"`);
    }
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : '';
}
