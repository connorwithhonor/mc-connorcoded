import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../lib/handler.mjs';
import {projectSnapshot,freshness} from '../lib/snapshot.mjs';
const owner={id:'owner',confirmedAt:'2026-09-26T00:00:00Z',roles:['control-owner']};
const sample=()=>projectSnapshot({},{});
const request=(method='GET')=>new Request('https://preview.example/api/control-status',{method});
for(const [name,user,status] of [['anonymous',null,401],['no role',{id:'x',confirmedAt:'yes'},403],['editable role',{id:'x',confirmedAt:'yes',userMetadata:{roles:['control-owner']}},403],['unconfirmed',{roles:['control-owner']},403]])test(name+' cannot read data',async()=>{let reads=0;const handle=createHandler({getUser:async()=>user,readSnapshot:async()=>{reads++;return sample();}});assert.equal((await handle(request())).status,status);assert.equal(reads,0);});
test('owner can read, with private cache headers',async()=>{const r=await createHandler({getUser:async()=>owner,readSnapshot:async()=>sample()})(request());assert.equal(r.status,200);assert.match(r.headers.get('Cache-Control'),/no-store/);assert.equal(r.headers.get('Netlify-CDN-Cache-Control'),'no-store');assert.equal((await r.json()).schemaVersion,1);});
test('all writes fail before storage',async()=>{for(const method of ['POST','PUT','DELETE','PATCH']){const r=await createHandler({getUser:async()=>{throw Error('should not read');},readSnapshot:async()=>{throw Error('should not read');}})(request(method));assert.equal(r.status,405);}});
test('missing or invalid storage is unknown, never an empty healthy board',async()=>{for(const snapshot of [null,{}, {schemaVersion:1}]){const r=await createHandler({getUser:async()=>owner,readSnapshot:async()=>snapshot})(request());assert.equal(r.status,503);}});
test('storage and auth exceptions do not leak secrets',async()=>{for(const authFailure of [true,false]){const r=await createHandler({getUser:async()=>{if(authFailure)throw Error('SECRET');return owner;},readSnapshot:async()=>{throw Error('SECRET');}})(request());assert.ok([401,503].includes(r.status));assert.doesNotMatch(await r.text(),/SECRET/);}});
test('export permits selected fields only',()=>{const secret='NEVER_EXPORT_THIS';const s=projectSnapshot({generatedAt:'2026-09-20',episodes:[{id:'e',video:secret,stages:{blog:{state:'done',note:secret}}}],runtime:[{name:'Frank',tasks:secret}],sources:[{path:secret}]},{accounts:[{id:'a',loc:secret,results:{workflows:{returned:3,rows:[{name:secret}]}}}],sourceRecords:secret},{token:secret,operations:[{id:'o',log:secret}]});assert.doesNotMatch(JSON.stringify(s),new RegExp(secret));assert.equal(s.observedAt,'2026-09-20');assert.equal(s.accounts[0].counts.workflows.returned,3);});
test('fresh export never freshens old evidence; invalid and future clocks unknown',()=>{const now=Date.parse('2026-09-26T12:00:00Z');assert.equal(freshness('2026-09-26T11:55:00Z',now),'Recent');assert.equal(freshness('2026-09-20T11:55:00Z',now),'Stale');assert.equal(freshness(null,now),'Unknown');assert.equal(freshness('2027-01-01',now),'Unknown');});

import {inviteTokenFromLink} from '../lib/invite-link.mjs';
test('invitation setup accepts only the known project and current origin',()=>{
 assert.equal(inviteTokenFromLink('https://mcp.connorcoded.com/#invite_token=example','https://preview.example'),'example');
 for(const url of ['https://evil.example/#invite_token=example','https://mcp.connorcoded.com.evil.example/#invite_token=example','http://mcp.connorcoded.com/#invite_token=example','https://mcp.connorcoded.com/#recovery_token=example'])assert.throws(()=>inviteTokenFromLink(url,'https://preview.example'));
});
