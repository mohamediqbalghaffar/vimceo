const admin = require('firebase-admin');
const { kv } = require('@vercel/kv');

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        // This expects FIREBASE_SERVICE_ACCOUNT env variable
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error('Firebase Admin initialization failed. Make sure FIREBASE_SERVICE_ACCOUNT is set.', e.message);
    }
}

async function sendPushNotification(userId, title, body) {
    if (!admin.apps.length) return;

    try {
        const tokens = await kv.smembers(`tokens:${userId}`);
        if (!tokens || tokens.length === 0) return;

        const message = {
            notification: { title, body },
            tokens: tokens
        };

        const response = await admin.messaging().sendMulticast(message);
        console.log(`Push sent to ${userId}: ${response.successCount} success, ${response.failureCount} failure`);
        
        // Clean up invalid tokens if needed
        if (response.failureCount > 0) {
            // Logic to remove failed tokens could go here
        }
    } catch (e) {
        console.error('Error sending push:', e);
    }
}

module.exports = { sendPushNotification };
