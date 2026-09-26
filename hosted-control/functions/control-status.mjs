import { getUser } from '@netlify/identity';
import { getStore } from '@netlify/blobs';
import { createHandler } from '../lib/handler.mjs';
export default createHandler({getUser, readSnapshot: () => getStore({name:'control-room-snapshots',consistency:'strong'}).get('current',{type:'json'})});
export const config = {path:'/api/control-status'};
