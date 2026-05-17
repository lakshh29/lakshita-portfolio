// netlify/functions/analytics.js
// POST /api/analytics  →  logs a page view
// GET  /api/analytics  →  returns stats (admin only)

const { connectDB } = require('./_db');
const jwt = require('jsonwebtoken');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const db = await connectDB();

  // ── POST: track a visit
  if (event.httpMethod === 'POST') {
    try {
      const { page, referrer } = JSON.parse(event.body || '{}');
      await db.collection('analytics').insertOne({
        page: page || '/',
        referrer: referrer || document?.referrer || '',
        ip: event.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
        userAgent: event.headers['user-agent'] || '',
        country: event.headers['x-country'] || '',
        createdAt: new Date(),
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── GET: return stats — admin only
  if (event.httpMethod === 'GET') {
    const auth = event.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    try {
      jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    } catch {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
    }

    try {
      const now = new Date();
      const day = new Date(now - 86400000);
      const week = new Date(now - 7 * 86400000);
      const month = new Date(now - 30 * 86400000);

      const [total, today, thisWeek, thisMonth, byPage, byCountry, recent] = await Promise.all([
        db.collection('analytics').countDocuments(),
        db.collection('analytics').countDocuments({ createdAt: { $gte: day } }),
        db.collection('analytics').countDocuments({ createdAt: { $gte: week } }),
        db.collection('analytics').countDocuments({ createdAt: { $gte: month } }),
        db.collection('analytics').aggregate([
          { $group: { _id: '$page', count: { $sum: 1 } } },
          { $sort: { count: -1 } }, { $limit: 10 }
        ]).toArray(),
        db.collection('analytics').aggregate([
          { $match: { country: { $ne: '' } } },
          { $group: { _id: '$country', count: { $sum: 1 } } },
          { $sort: { count: -1 } }, { $limit: 10 }
        ]).toArray(),
        db.collection('analytics').find({}).sort({ createdAt: -1 }).limit(20).toArray(),
      ]);

      // Daily breakdown for last 14 days
      const daily = await db.collection('analytics').aggregate([
        { $match: { createdAt: { $gte: new Date(now - 14 * 86400000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray();

      return {
        statusCode: 200, headers,
        body: JSON.stringify({ total, today, thisWeek, thisMonth, byPage, byCountry, recent, daily }),
      };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
