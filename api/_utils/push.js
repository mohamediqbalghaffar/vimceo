const admin = require('firebase-admin');
const { kv } = require('@vercel/kv');

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is missing');
        }
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin initialized successfully');
    } catch (e) {
        console.error('Firebase Admin initialization failed:', e.message);
    }
}

async function sendPushNotification(userId, title, body) {
    if (!admin.apps.length) {
        console.warn(`Cannot send push to ${userId}: Firebase Admin not initialized`);
        return;
    }

    try {
        const tokens = await kv.smembers(`tokens:${userId}`);
        if (!tokens || tokens.length === 0) {
            console.log(`No push tokens found for user ${userId}`);
            return;
        }

        const message = {
            notification: { title, body },
            tokens: tokens
        };

        // Use sendEachForMulticast (FCM v1 compatible multicast)
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Push attempt for ${userId}: ${response.successCount} success, ${response.failureCount} failure`);
        
        // Clean up invalid tokens
        if (response.failureCount > 0) {
            const tokensToRemove = [];
            response.responses.forEach((res, idx) => {
                if (!res.success) {
                    const errorCode = res.error?.code;
                    if (errorCode === 'messaging/registration-token-not-registered' || errorCode === 'messaging/invalid-registration-token') {
                        tokensToRemove.push(tokens[idx]);
                    }
                }
            });
            if (tokensToRemove.length > 0) {
                await Promise.all(tokensToRemove.map(t => kv.srem(`tokens:${userId}`, t)));
                console.log(`Cleaned up ${tokensToRemove.length} invalid tokens for ${userId}`);
            }
        }
    } catch (e) {
        console.error(`Error in sendPushNotification for ${userId}:`, e);
    }
}

module.exports = { sendPushNotification };
