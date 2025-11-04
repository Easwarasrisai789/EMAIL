import { Resend } from 'resend';

export const config = {
  regions: ['bom1', 'sin1'] // choose the closest region to your users
};

const ALLOWED_ORIGINS = [
  'http://localhost:5500',
  'http://127.0.0.1:5500'
  // add your production origin, e.g. 'https://your-domain.com'
];

function corsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  };
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return res.status(204).set(headers).end();
  }

  if (req.method === 'GET') {
    return res.status(200).set(headers).send('ok');
  }

  if (req.method !== 'POST') {
    return res.status(405).set(headers).json({ error: 'Method Not Allowed' });
  }

  try {
    const { requestId, to, subject, body, html } = req.body || {};
    if (!to || !subject || (!body && !html)) {
      return res.status(400).set(headers).json({ error: 'Missing required fields: to, subject, body|html' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).set(headers).json({ error: 'RESEND_API_KEY not configured' });
    }

    const resend = new Resend(apiKey);
    const from = 'onboarding@resend.dev'; // replace with your verified sender later

    const result = await resend.emails.send({
      from,
      to,
      subject,
      text: body || undefined,
      html: html || undefined,
      headers: { 'X-Request-Id': requestId || '' }
    });

    if (result.error) {
      return res.status(502).set(headers).json({ error: result.error.message || 'Resend error' });
    }

    return res.status(200).set(headers).json({ id: result.data?.id || 'sent' });
  } catch (err) {
    return res.status(500).set(headers).json({ error: err?.message || 'Server error' });
  }
}