importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Configuration will be injected or we use the same as in app
// For now, we need to repeat the config here or use a dynamic approach.
// Since it's a simple file, we'll assume the user will keep this updated.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

if (firebaseConfig.apiKey === 'YOUR_API_KEY') {
    console.error('[sw] Firebase configuration is NOT set up in firebase-messaging-sw.js');
}

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'نووسراوی نوێ';
  const notificationOptions = {
    body: payload.notification?.body || 'تکایە داشبۆردەکەت بپشکنە',
    icon: '/icon.png',
    badge: '/icon.png',
    data: {
      url: self.location.origin, // Open root when clicked
      ...(payload.data || {})
    },
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click to open the app or focus the existing tab
self.addEventListener('notificationclick', function(event) {
    console.log('[firebase-messaging-sw.js] Notification click Received.', event.notification.data);
    event.notification.close();
    
    // The URL to open/focus (we default to origin)
    const targetUrl = event.notification.data?.url || self.location.origin;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                // If so, just focus it
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
