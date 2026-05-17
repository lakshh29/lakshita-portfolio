// netlify/functions/contact.js
// POST /api/contact  →  saves message to DB + sends email via Resend

const { connectDB } = require('./_db');
const { Resend } = require('resend');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { name, email, subject, message } = body;

  // Validate required fields
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return {
      statusCode: 400, headers,
      body: JSON.stringify({ error: 'Name, email and message are required' }),
    };
  }

  // Basic email validation
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test(email)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid email address' }) };
  }

  try {
    // 1. Save to MongoDB
    const db = await connectDB();
    const doc = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject?.trim() || '(No subject)',
      message: message.trim(),
      ip: event.headers['x-forwarded-for'] || 'unknown',
      userAgent: event.headers['user-agent'] || 'unknown',
      read: false,
      createdAt: new Date(),
    };
    const result = await db.collection('messages').insertOne(doc);

    // 2. Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'Portfolio <onboarding@resend.dev>',   // change after domain verified
      to: [process.env.OWNER_EMAIL || 'lakshitaajakhar@gmail.com'],
      replyTo: email,
      subject: `💌 New message: ${doc.subject}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;background:#f9f9f9;border-radius:12px;overflow:hidden">
          <div style="background:#F0A500;padding:24px 32px">
            <h2 style="color:#13141a;margin:0;font-size:1.4rem">New Portfolio Message</h2>
          </div>
          <div style="padding:28px 32px">
            <p style="margin:0 0 8px"><strong>From:</strong> ${doc.name} &lt;${doc.email}&gt;</p>
            <p style="margin:0 0 8px"><strong>Subject:</strong> ${doc.subject}</p>
            <p style="margin:0 0 20px"><strong>Received:</strong> ${new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</p>
            <hr style="border:none;border-top:1px solid #e5e5e5;margin:0 0 20px">
            <p style="white-space:pre-wrap;color:#333;line-height:1.7">${doc.message}</p>
          </div>
          <div style="padding:16px 32px;background:#f0f0f0;font-size:.8rem;color:#888">
            Sent from your portfolio contact form • Reply directly to respond to ${doc.name}
          </div>
        </div>
      `,
    });

    // 3. Send auto-reply to sender
    await resend.emails.send({
      from: 'Lakshita Jakhar <onboarding@resend.dev>',
      to: [email],
      subject: `Thanks for reaching out, ${doc.name.split(' ')[0]}! 👋`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto">
          <div style="background:#13141a;padding:24px 32px;border-radius:12px 12px 0 0">
            <h2 style="color:#F0A500;margin:0;font-size:1.3rem">Thanks for your message!</h2>
          </div>
          <div style="padding:28px 32px;background:#1a1b24;border-radius:0 0 12px 12px">
            <p style="color:#E8EAF6;line-height:1.8">Hi ${doc.name.split(' ')[0]},<br><br>
            Thanks for reaching out through my portfolio. I've received your message and will get back to you within 24–48 hours.<br><br>
            In the meantime, feel free to check out my <a href="https://github.com/lakshh29" style="color:#F0A500">GitHub</a> or connect on <a href="https://linkedin.com/in/lakshita-jakhar-983b86255" style="color:#F0A500">LinkedIn</a>.<br><br>
            — Lakshita Jakhar</p>
          </div>
        </div>
      `,
    });

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ success: true, id: result.insertedId }),
    };

  } catch (err) {
    console.error('Contact error:', err);
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: 'Failed to send message. Please try again.' }),
    };
  }
};
