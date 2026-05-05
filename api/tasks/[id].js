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
            await kv.hset(`task:${id}`, { status: status || 'done' });
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
