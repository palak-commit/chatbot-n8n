/* global clients */
self.addEventListener('push', function(event) {
  console.log('[SW] Push event received');
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
    data = { title: 'નવું નોટિફિકેશન', body: event.data ? event.data.text() : 'તમારી પાસે એક નવો મેસેજ છે.' };
  }

  const title = data.title || 'નવું નોટિફિકેશન';
  const options = {
    body: data.body || 'તમારી પાસે એક નવો મેસેજ છે.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: data.url || '/',
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'જુઓ' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[SW] Notification shown successfully'))
      .catch(err => console.error('[SW] Error showing notification:', err))
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked');
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
});
