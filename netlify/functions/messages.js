// netlify/functions/messages.js
// GET    /api/messages        → list all messages (admin)
// PATCH  /api/messages?id=x  → mark as read
// DELETE /api/messages?id=x  → delete message

const { connectDB } = require('./_db');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

function verifyToken(event) {
  const auth = event.headers.authorization;
  if (!auth?.startsWith('Bearer ')) throw new Error('Unauthorized');
  try {
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET);
  } catch {
    throw new Error('Invalid token');
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    verifyToken(event);
  } catch (err) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: err.message }) };
  }

  const db = await connectDB();
  const id = event.queryStringParameters?.id;

  // GET: list messages
  if (event.httpMethod === 'GET') {
    const messages = await db.collection('messages')
      .find({}).sort({ createdAt: -1 }).limit(100).toArray();
    const unread = await db.collection('messages').countDocuments({ read: false });
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ messages, unread }),
    };
  }

  // PATCH: mark as read
  if (event.httpMethod === 'PATCH') {
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID required' }) };
    await db.collection('messages').updateOne(
      { _id: new ObjectId(id) },
      { $set: { read: true } }
    );
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  // DELETE: remove message
  if (event.httpMethod === 'DELETE') {
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID required' }) };
    await db.collection('messages').deleteOne({ _id: new ObjectId(id) });
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
