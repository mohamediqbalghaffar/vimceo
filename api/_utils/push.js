const webpush = require('web-push');
const { kv } = require('@vercel/kv');

// Automatically configure VAPID keys from KV or generate new ones
let configured = false;
async function setupWebPush() {
    if (configured) return;
    
    let publicKey = await kv.get('vapid:publicKey');
    let privateKey = await kv.get('vapid:privateKey');

    if (!publicKey || !privateKey) {
        const vapidKeys = webpush.generateVAPIDKeys();
        publicKey = vapidKeys.publicKey;
        privateKey = vapidKeys.privateKey;
        await kv.set('vapid:publicKey', publicKey);
        await kv.set('vapid:privateKey', privateKey);
        console.log('New VAPID keys generated and saved to KV');
    }

    webpush.setVapidDetails(
        'mailto:admin@hts-vimceo.com',
        publicKey,
        privateKey
    );
    configured = true;
}

async function sendPushNotification(userId, title, body) {
    await setupWebPush();

    try {
        const subscriptions = await kv.smembers(`tokens:${userId}`);
        if (!subscriptions || subscriptions.length === 0) {
            console.log(`No push subscriptions found for user ${userId}`);
            return;
        }

        const payload = JSON.stringify({
            notification: { title, body }
        });

        // Send to all subscriptions
        const promises = subscriptions.map(async (subStr) => {
            try {
                const sub = JSON.parse(subStr);
                await webpush.sendNotification(sub, payload);
            } catch (err) {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    // Subscription expired or invalid, remove it
                    await kv.srem(`tokens:${userId}`, subStr);
                    console.log('Removed invalid subscription');
                } else {
                    console.error('Push error:', err);
                }
            }
        });

        await Promise.all(promises);
        console.log(`Push attempt for ${userId} completed`);
        
    } catch (e) {
        console.error(`Error in sendPushNotification for ${userId}:`, e);
    }
}

module.exports = { sendPushNotification, setupWebPush };
