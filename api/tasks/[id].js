const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;

    // PATCH /api/tasks/:id — update status to done
    if (req.method === 'PATCH') {
        try {
            const { status } = req.body;
            const existingTask = await kv.hgetall(`task:${id}`);
            
            await kv.hset(`task:${id}`, { status: status || 'done' });
            
            if (existingTask && (status === 'done' || !status)) {
                const { sendPushNotification } = require('../_utils/push');
                await sendPushNotification(existingTask.senderId, 'نووسراو تەواو بوو', `نووسراوی "${existingTask.title}" تەواو کرا.`);
            }

            return res.json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // DELETE /api/tasks/:id
    if (req.method === 'DELETE') {
        try {
            await kv.del(`task:${id}`);
            await kv.srem('tasks:index', id);
            return res.json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
