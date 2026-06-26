/**
 * Batch synthesis helpers.
 *
 * The batch endpoint accepts many synthesis items in one request and queues
 * each as an async job. Items are validated independently so one bad item
 * doesn't fail the whole batch — invalid items are reported, valid ones queued.
 * See POST /v1/synthesize/batch.
 */

export const MAX_BATCH_ITEMS = 50;
export const MAX_BATCH_TEXT_CHARS = 5000;

/**
 * Validate a single batch item.
 * @param {unknown} item
 * @param {string[]} supportedProviders - provider ids with a registered adapter
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateBatchItem(item, supportedProviders) {
  if (!item || typeof item !== 'object') {
    return { ok: false, error: 'item must be an object' };
  }
  const text = typeof item.text === 'string' ? item.text : '';
  if (!text.trim()) {
    return { ok: false, error: 'text is required' };
  }
  if (text.length > MAX_BATCH_TEXT_CHARS) {
    return { ok: false, error: `text exceeds ${MAX_BATCH_TEXT_CHARS} character limit` };
  }
  if (!item.provider) {
    return { ok: false, error: 'provider is required' };
  }
  if (!supportedProviders.includes(item.provider)) {
    return { ok: false, error: `unsupported provider: ${item.provider}` };
  }
  return { ok: true };
}
