import { getUser } from '@netlify/identity';
import { getStore } from '@netlify/blobs';
import { createHandler } from '../lib/handler.mjs';
const snapshots = () => getStore({name:'control-room-snapshots',consistency:'strong'});
const leadInbox = () => getStore({name:'control-room-lead-inbox',consistency:'strong'});
export default createHandler({
  getUser,
  readSnapshot: () => snapshots().get('current',{type:'json'}),
  readLeadInbox: () => leadInbox().get('current',{type:'json'})
});
export const config = {path:'/api/control-status'};
