/* ── Shah AHMS — Notification Utilities ─────────────────────────────────── */

/* ── Chime sound (Web Audio API, no file needed) ────────────────────────── */
export function playNotificationChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const play = (freq, startTime, duration, gainVal) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const t = ctx.currentTime;
    play(880,  t,        0.35, 0.25);
    play(1100, t + 0.12, 0.35, 0.20);
    play(1320, t + 0.24, 0.50, 0.18);
  } catch { /* AudioContext not supported — fail silently */ }
}

/* ── Register Service Worker ─────────────────────────────────────────────── */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (e) {
    console.warn('[SW] Registration failed:', e.message);
    return null;
  }
}

/* ── Request browser notification permission ────────────────────────────── */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

/* ── Subscribe to Web Push ───────────────────────────────────────────────── */
export async function subscribeToPush(serverPublicKey) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(serverPublicKey),
    });
    return sub;
  } catch (e) {
    console.warn('[Push] Subscribe failed:', e.message);
    return null;
  }
}

/* ── Unsubscribe from Web Push ───────────────────────────────────────────── */
export async function unsubscribeFromPush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    return true;
  } catch { return false; }
}

/* ── Show browser OS notification (when tab is focused) ─────────────────── */
export function showBrowserNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      requireInteraction: false,
      ...options,
    });
    if (options.url) n.onclick = () => { window.focus(); window.location.href = options.url; n.close(); };
    setTimeout(() => n.close(), 8000);
  } catch { /* some browsers block Notification from service worker context */ }
}

/* ── Base64 VAPID key converter ──────────────────────────────────────────── */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
