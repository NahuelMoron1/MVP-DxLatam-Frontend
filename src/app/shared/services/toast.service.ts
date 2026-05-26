import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  readonly toasts = signal<Toast[]>([]);

  show(message: string, type: ToastType = 'success'): void {
    const id = ++this.counter;
    this.toasts.update((ts) => [...ts, { id, message, type }]);
    setTimeout(() => this.dismiss(id), 3500);
  }

  showError(err: unknown, fallback: string): void {
    const apiMessage = (err as any)?.error?.error?.message;
    this.show(apiMessage ?? fallback, 'error');
  }

  dismiss(id: number): void {
    this.toasts.update((ts) => ts.filter((t) => t.id !== id));
  }
}
