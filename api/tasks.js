const { kv } = require('@vercel/kv');
const { sendPushNotification } = require('./_utils/push');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // GET /api/tasks?userId=xxx&role=sender|receiver
    if (req.method === 'GET') {
        try {
            const { userId, role } = req.query;
            const ids = await kv.smembers('tasks:index');
            if (!ids || ids.length === 0) return res.json([]);
            const tasks = await Promise.all(ids.map(id => kv.hgetall(`task:${id}`)));
            let filtered = tasks
                .filter(Boolean)
                .map((t, i) => ({ id: ids[i], ...t }))
                .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

            if (role === 'sender' && userId) {
                filtered = filtered.filter(t => t.senderId === userId);
            } else if (role === 'receiver' && userId) {
                filtered = filtered.filter(t => t.receiverId === userId);
            }
            return res.json(filtered);
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // POST /api/tasks — create task
    if (req.method === 'POST') {
        try {
            const { title, note, link, category, senderId, receiverId } = req.body;
            if (!title || !senderId || !receiverId) return res.status(400).json({ error: 'زانیاری کەم' });
            const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const task = { id, title, note: note || '', link: link || '', category, senderId, receiverId, status: 'pending', createdAt: Date.now() };
            await kv.hset(`task:${id}`, task);
            await kv.sadd('tasks:index', id);
            
            // Send Notification to Receiver
            const receiver = await kv.hgetall(`user:${receiverId}`);
            if (receiver) {
                await sendPushNotification(receiverId, 'نووسراوی نوێ', `نووسراوێکی نوێت بۆ هاتوە: ${title}`);
            }

            return res.status(201).json(task);
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
