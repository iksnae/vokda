import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

let counter = 0;

const store = writable<Toast[]>([]);

export const toasts = { subscribe: store.subscribe };

export function addToast(message: string, type: ToastType = 'success', durationMs = 3000): string {
  const id = `toast-${++counter}-${Date.now()}`;
  const toast: Toast = { id, message, type };

  store.update((all) => [...all, toast]);

  if (durationMs > 0) {
    setTimeout(() => dismissToast(id), durationMs);
  }

  return id;
}

export function dismissToast(id: string): void {
  store.update((all) => all.filter((t) => t.id !== id));
}

export function clearToasts(): void {
  counter = 0;
  store.set([]);
}
