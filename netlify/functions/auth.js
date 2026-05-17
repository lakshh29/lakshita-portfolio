// netlify/functions/auth.js
// POST /api/auth  →  login with password → returns JWT
// GET  /api/auth  →  verify token validity

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  // ── POST: Login
  if (event.httpMethod === 'POST') {
    try {
      const { password } = JSON.parse(event.body || '{}');
      if (!password) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password required' }) };
      }

      // ADMIN_PASSWORD_HASH is a bcrypt hash stored in Netlify env vars
      // Generate it once: bcrypt.hashSync('your-password', 12)
      const hash = process.env.ADMIN_PASSWORD_HASH;
      if (!hash) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Admin not configured' }) };
      }

      const valid = await bcrypt.compare(password, hash);
      if (!valid) {
        // Delay to prevent brute-force
        await new Promise(r => setTimeout(r, 800));
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Incorrect password' }) };
      }

      const token = jwt.sign(
        { role: 'admin', iat: Math.floor(Date.now() / 1000) },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      return {
        statusCode: 200, headers,
        body: JSON.stringify({ token, expiresIn: 28800 }),
      };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── GET: Verify token
  if (event.httpMethod === 'GET') {
    const auth = event.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return { statusCode: 401, headers, body: JSON.stringify({ valid: false }) };
    }
    try {
      const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
      return { statusCode: 200, headers, body: JSON.stringify({ valid: true, decoded }) };
    } catch {
      return { statusCode: 401, headers, body: JSON.stringify({ valid: false }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
