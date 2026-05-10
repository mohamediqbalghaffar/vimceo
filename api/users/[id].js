const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;

    if (req.method === 'PATCH') {
        try {
            const updates = req.body;
            const existingUser = await kv.hgetall(`user:${id}`);
            if (!existingUser) return res.status(404).json({ error: 'User not found' });
            
            const updatedUser = { ...existingUser, ...updates };
            await kv.hset(`user:${id}`, updatedUser);
            
            return res.json({ success: true, user: updatedUser });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method === 'DELETE') {
        try {
            await kv.del(`user:${id}`);
            await kv.srem('users:index', id);
            // Also remove all tasks belonging to this user
            const taskIds = await kv.smembers('tasks:index');
            if (taskIds && taskIds.length > 0) {
                for (const tid of taskIds) {
                    const task = await kv.hgetall(`task:${tid}`);
                    if (task && (task.senderId === id || task.receiverId === id)) {
                        await kv.del(`task:${tid}`);
                        await kv.srem('tasks:index', tid);
                    }
                }
            }
            return res.json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
