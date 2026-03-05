import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { toasts, addToast, dismissToast, clearToasts } from './toast-store';

describe('Toast store', () => {
  beforeEach(() => {
    clearToasts();
  });

  it('starts with empty toasts', () => {
    expect(get(toasts)).toEqual([]);
  });

  it('adds a toast with message', () => {
    addToast('Voice saved!');
    const all = get(toasts);
    expect(all).toHaveLength(1);
    expect(all[0].message).toBe('Voice saved!');
  });

  it('adds a toast with type', () => {
    addToast('Error occurred', 'error');
    const all = get(toasts);
    expect(all[0].type).toBe('error');
  });

  it('defaults to success type', () => {
    addToast('Done');
    const all = get(toasts);
    expect(all[0].type).toBe('success');
  });

  it('assigns unique ids', () => {
    addToast('First');
    addToast('Second');
    const all = get(toasts);
    expect(all[0].id).not.toBe(all[1].id);
  });

  it('dismisses a toast by id', () => {
    addToast('To dismiss');
    const all = get(toasts);
    dismissToast(all[0].id);
    expect(get(toasts)).toHaveLength(0);
  });

  it('clears all toasts', () => {
    addToast('One');
    addToast('Two');
    clearToasts();
    expect(get(toasts)).toHaveLength(0);
  });
});
