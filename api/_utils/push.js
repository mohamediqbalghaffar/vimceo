const webpush = require('web-push');
const { kv } = require('@vercel/kv');

// Initialize Web Push with VAPID keys
webpush.setVapidDetails(
  'mailto:admin@example.com',
  'BALnkoqXlHVQ2J3hBAhBczs0KEGJ7OE2321BBtB1ZUdpExSYyDKXQcOBllaXdUyULF-oseQ8sUQxGKmzeuKA_3o',
  'd1lP78SNo_qt3oZis-Av2b7D1IdkMUegZaO6F8XmDOo'
);

async function sendPushNotification(userId, title, body) {
    try {
        const tokens = await kv.smembers(`tokens:${userId}`);
        if (!tokens || tokens.length === 0) {
            console.log(`No push subscriptions found for user ${userId}`);
            return;
        }

        const payload = JSON.stringify({ title, body });

        const promises = tokens.map(async (tokenStr) => {
            try {
                // Parse the stringified PushSubscription object
                const sub = typeof tokenStr === 'string' ? JSON.parse(tokenStr) : tokenStr;
                await webpush.sendNotification(sub, payload);
            } catch (err) {
                console.error('Failed to send push:', err.message);
                // Clean up invalid subscriptions
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await kv.srem(`tokens:${userId}`, tokenStr);
                }
            }
        });

        await Promise.all(promises);
        console.log(`Push attempt for ${userId} finished.`);
    } catch (e) {
        console.error('Push notification outer error:', e.message);
    }
}

module.exports = { sendPushNotification };
