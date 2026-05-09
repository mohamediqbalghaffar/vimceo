self.addEventListener('push', function(event) {
    if (event.data) {
        let payload;
        try {
            payload = event.data.json();
        } catch (e) {
            payload = { notification: { title: 'نووسراوی نوێ', body: event.data.text() } };
        }

        const title = payload.notification?.title || 'نووسراوی نوێ';
        const body = payload.notification?.body || 'تکایە داشبۆردەکەت بپشکنە';

        // Send to foreground if app is open
        const channel = new BroadcastChannel('push-channel');
        channel.postMessage({ type: 'PUSH_RECEIVED', payload: { title, body } });

        const notificationOptions = {
            body: body,
            icon: '/icon.png',
            badge: '/icon.png',
            data: {
                url: self.location.origin,
                ...(payload.data || {})
            },
            vibrate: [200, 100, 200]
        };

        event.waitUntil(self.registration.showNotification(title, notificationOptions));
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    const targetUrl = event.notification.data?.url || self.location.origin;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
