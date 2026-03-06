/**
 * SSML structural validator.
 *
 * Uses DOMParser to parse SSML as XML, then walks the tree to check
 * structure, known tags, and provider compatibility.
 */

import { getTagDef, isTagSupportedByProvider, SSML_TAGS } from './tags';

export type SsmlError = {
  type: 'error';
  message: string;
  offset?: number;
  line?: number;
};

export type SsmlWarning = {
  type: 'warning';
  message: string;
  tag?: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: SsmlError[];
  warnings: SsmlWarning[];
};

/** Set of known SSML tag names (from registry). */
const KNOWN_TAGS = new Set(SSML_TAGS.map((t) => t.tag));
// Also allow <speak> as the root wrapper.
KNOWN_TAGS.add('speak');

/**
 * Validate an SSML string for structural correctness and provider compatibility.
 *
 * - Empty input → error
 * - Missing `<speak>` wrapper → warning (auto-wrap for validation)
 * - Malformed XML → error
 * - Unknown tags → warning (may be provider extensions)
 * - Tags unsupported by provider → warning
 */
export function validateSsml(ssml: string, providerId: string): ValidationResult {
  const errors: SsmlError[] = [];
  const warnings: SsmlWarning[] = [];

  if (!ssml.trim()) {
    return { valid: false, errors: [{ type: 'error', message: 'SSML input is empty.' }], warnings };
  }

  let xmlInput = ssml.trim();
  let autoWrapped = false;

  // Check if input has <speak> root
  if (!xmlInput.startsWith('<speak')) {
    autoWrapped = true;
    xmlInput = `<speak>${xmlInput}</speak>`;
    warnings.push({
      type: 'warning',
      message: 'Missing <speak> root element — it will be added automatically.',
    });
  }

  // Parse as XML
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlInput, 'application/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    const errorText = parseError.textContent ?? 'Unknown XML parse error';
    errors.push({
      type: 'error',
      message: `Invalid SSML: ${extractParseErrorMessage(errorText)}`,
    });
    return { valid: false, errors, warnings };
  }

  // Verify root is <speak>
  const root = doc.documentElement;
  if (root.tagName !== 'speak') {
    errors.push({
      type: 'error',
      message: `Root element must be <speak>, found <${root.tagName}>.`,
    });
    return { valid: false, errors, warnings };
  }

  // Walk the tree and validate tags
  walkElement(root, providerId, warnings);

  return { valid: errors.length === 0, errors, warnings };
}

/** Recursively walk the DOM tree, checking tags and provider support. */
function walkElement(el: Element, providerId: string, warnings: SsmlWarning[]): void {
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    const tagName = child.tagName;

    if (!KNOWN_TAGS.has(tagName)) {
      warnings.push({
        type: 'warning',
        message: `Unknown SSML tag <${tagName}> — may not be supported.`,
        tag: tagName,
      });
    } else if (tagName !== 'speak' && !isTagSupportedByProvider(tagName, providerId)) {
      const def = getTagDef(tagName);
      warnings.push({
        type: 'warning',
        message: `<${tagName}> is not supported by this provider and may be ignored.`,
        tag: tagName,
      });
    }

    // Recurse into children
    if (child.children.length > 0) {
      walkElement(child, providerId, warnings);
    }
  }
}

/** Extract a human-readable message from DOMParser's parsererror. */
function extractParseErrorMessage(raw: string): string {
  // DOMParser errors are verbose; try to get the first meaningful line
  const lines = raw.split('\n').filter((l) => l.trim());
  if (lines.length > 0) {
    // Often the first line has the error description
    const first = lines[0].trim();
    // Clean up common prefixes
    return first.replace(/^This page contains the following errors?:\s*/i, '').trim() || 'Malformed XML structure.';
  }
  return 'Malformed XML structure.';
}
