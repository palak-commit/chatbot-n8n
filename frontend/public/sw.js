/* global clients */
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'નવું નોટિફિકેશન';
  const options = {
    body: data.body || 'તમારી પાસે એક નવો મેસેજ છે.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: data.url || '/'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
