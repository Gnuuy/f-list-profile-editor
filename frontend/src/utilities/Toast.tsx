// utils/toast.ts
export type ToastKind = 'success' | 'error';

export function toast(message: string, kind: ToastKind = 'success') {
  const el = document.createElement('div');
  el.className = `app-toast ${kind}`;
  el.textContent = message;
  document.body.appendChild(el);

  // animate in
  requestAnimationFrame(() => el.classList.add('show'));

  // auto-dismiss
  const DURATION = 1600;
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 200); // match CSS transition
  }, DURATION);
}
