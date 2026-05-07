self.addEventListener('install', () => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log('[SW] Service Worker activated');
});

// Note: Push and notificationclick listeners removed to favor local browser notifications
// when the app is open. Background notifications require VAPID which was removed.
