import {getStore} from '@netlify/blobs';
import {authorized, mergeLeadInbox, normalizeLeadInbox} from '../lib/lead-inbox.mjs';

const headers = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const response = (body, status) => Response.json(body, {status, headers});

export function createLeadInboxIngest({getSecret, readInbox, writeInbox}) {
  return async request => {
    if (request.method !== 'POST') return response({error:'Method not allowed.'}, 405);
    if (!authorized(request, getSecret())) return response({error:'Unauthorized.'}, 401);
    const length = Number(request.headers.get('content-length') || 0);
    if (!Number.isFinite(length) || length > 200000) return response({error:'Payload too large.'}, 413);
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return response({error:'Expected application/json.'}, 415);
    let received;
    try { received = normalizeLeadInbox(await request.json()); } catch { return response({error:'Invalid lead inbox payload.'}, 400); }
    try {
      const inbox = mergeLeadInbox(await readInbox(), received);
      await writeInbox(inbox);
      return response({accepted:true, observedAt: inbox.observedAt, sourceCount: inbox.sources.length, eventCount: inbox.events.length}, 202);
    } catch { return response({error:'Lead inbox storage is unavailable.'}, 503); }
  };
}

const store = () => getStore({name:'control-room-lead-inbox', consistency:'strong'});
export default createLeadInboxIngest({
  getSecret: () => Netlify.env.get('LEAD_INBOX_INGEST_KEY'),
  readInbox: () => store().get('current', {type:'json'}),
  writeInbox: inbox => store().setJSON('current', inbox)
});
export const config = {path:'/api/lead-inbox/ingest', method:['POST']};
