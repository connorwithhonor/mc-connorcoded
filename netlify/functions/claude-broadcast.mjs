import { getStore } from '@netlify/blobs';

const STORE_NAME   = 'claude-broadcast';
const STATE_KEY    = 'messages';
const SEED_URL_REL = '/claude-messages.json';

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age':       '86400',
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
  });

async function readState(store, origin) {
  const existing = await store.get(STATE_KEY, { type: 'json' });
  if (existing && Array.isArray(existing.messages)) return existing;

  try {
    const seed = await fetch(`${origin}${SEED_URL_REL}`, { cache: 'no-store' });
    if (seed.ok) {
      const data = await seed.json();
      if (Array.isArray(data.messages)) return data;
    }
  } catch { /* ignore */ }

  return { updated: new Date().toISOString(), messages: [] };
}

async function writeState(store, state) {
  state.updated = new Date().toISOString();
  await store.setJSON(STATE_KEY, state);
  return state;
}

export default async (req, context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const store  = getStore({ name: STORE_NAME, consistency: 'strong' });
  const origin = new URL(req.url).origin;

  if (req.method === 'GET') {
    const state = await readState(store, origin);
    return json(state);
  }

  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  const token    = process.env.CLAUDE_BROADCAST_TOKEN;
  const provided = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');

  if (!token) return json({ error: 'server misconfigured: CLAUDE_BROADCAST_TOKEN not set' }, 500);
  if (!provided || provided !== token) return json({ error: 'unauthorized' }, 401);

  let payload;
  try { payload = await req.json(); }
  catch { return json({ error: 'invalid json body' }, 400); }

  const body = typeof payload?.body === 'string' ? payload.body.trim() : '';
  if (!body) return json({ error: 'body required' }, 400);

  const lane      = payload?.lane ?? null;
  const timestamp = payload?.timestamp || new Date().toISOString();

  const state = await readState(store, origin);

  if (state.messages.some(m => m.timestamp === timestamp)) {
    return json({ error: 'duplicate timestamp', timestamp }, 409);
  }

  const message = { timestamp, lane, body };
  state.messages.push(message);

  const next = await writeState(store, state);
  return json({ ok: true, message, count: next.messages.length, updated: next.updated }, 201);
};

export const config = { path: '/api/claude-broadcast' };
