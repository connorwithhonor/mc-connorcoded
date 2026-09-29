import { validSnapshot } from './snapshot.mjs';
import { mergeLeadInbox, normalizeLeadInbox } from './lead-inbox.mjs';
const headers = {'Cache-Control':'private, no-store, max-age=0','Netlify-CDN-Cache-Control':'no-store','Vary':'Cookie, Authorization','X-Content-Type-Options':'nosniff'};
const json = (value, status=200) => Response.json(value, {status,headers});
export function createHandler({getUser, readSnapshot, readLeadInbox = async () => null, readLeadInboxBaseline = async () => null}) {
  return async request => {
    if(request.method !== 'GET') return json({error:'This release is read-only. No request was queued.'},405);
    let user;
    try { user=await getUser(); } catch { return json({error:'Sign-in unavailable.'},401); }
    if(!user) return json({error:'Sign in to view the control room.'},401);
    // roles is server-owned app_metadata, not editable profile data.
    if(!user.confirmedAt || !Array.isArray(user.roles) || !user.roles.includes('control-owner')) return json({error:'This account has not been granted control-room access.'},403);
    try {
      const snapshot=await readSnapshot();
      if(!snapshot) return json({authorized:true,error:'Signed in. The first business-data connection is still pending.'},503);
      if(!validSnapshot(snapshot)) return json({authorized:true,error:'Snapshot format is invalid. Status is unknown.'},503);
      let leadInbox = null;
      let leadInboxBaseline = null;
      try { leadInbox = normalizeLeadInbox(await readLeadInbox()); } catch { leadInbox = null; }
      try { leadInboxBaseline = normalizeLeadInbox(await readLeadInboxBaseline()); } catch { leadInboxBaseline = null; }
      if(leadInboxBaseline && leadInbox) leadInbox = mergeLeadInbox(leadInboxBaseline, leadInbox);
      else if(leadInboxBaseline) leadInbox = leadInboxBaseline;
      if(leadInbox) snapshot.leadInbox = leadInbox;
      return json(snapshot);
    } catch { return json({authorized:true,error:'Status source unavailable. Nothing has been changed.'},503); }
  };
}
