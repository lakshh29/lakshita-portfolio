// netlify/functions/_db.js
// Shared MongoDB connection — reused across warm function invocations

const { MongoClient } = require('mongodb');

let client = null;
let db = null;

async function connectDB() {
  if (db) return db;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable not set');
  }

  client = new MongoClient(process.env.MONGODB_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });

  await client.connect();
  db = client.db('portfolio');
  console.log('✅ MongoDB connected');
  return db;
}

module.exports = { connectDB };
