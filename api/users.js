const { kv } = require('@vercel/kv');

const ADMIN_PASS = 'Admin1234';

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // GET /api/users — list all users
    if (req.method === 'GET') {
        try {
            const ids = await kv.smembers('users:index');
            if (!ids || ids.length === 0) return res.json([]);
            const users = await Promise.all(ids.map(id => kv.hgetall(`user:${id}`)));
            return res.json(users.filter(Boolean).map((u, i) => ({ id: ids[i], ...u })));
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // POST /api/users — create user (Admin only)
    if (req.method === 'POST') {
        const { name, password, role, adminPass } = req.body;
        if (adminPass !== ADMIN_PASS) return res.status(403).json({ error: 'غیر مجاز' });
        if (!name || !password || !role) return res.status(400).json({ error: 'زانیاری کەم' });
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const user = { id, name, password, role, createdAt: Date.now() };
        await kv.hset(`user:${id}`, user);
        await kv.sadd('users:index', id);
        return res.status(201).json(user);
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
