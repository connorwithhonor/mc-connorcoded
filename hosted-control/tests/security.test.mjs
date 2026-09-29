import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../lib/handler.mjs';
import {projectSnapshot,freshness} from '../lib/snapshot.mjs';
const owner={id:'owner',confirmedAt:'2026-09-26T00:00:00Z',roles:['control-owner']};
const sample=()=>projectSnapshot({},{});
const request=(method='GET')=>new Request('https://preview.example/api/control-status',{method});
for(const [name,user,status] of [['anonymous',null,401],['no role',{id:'x',confirmedAt:'yes'},403],['editable role',{id:'x',confirmedAt:'yes',userMetadata:{roles:['control-owner']}},403],['unconfirmed',{roles:['control-owner']},403]])test(name+' cannot read data',async()=>{let reads=0;const handle=createHandler({getUser:async()=>user,readSnapshot:async()=>{reads++;return sample();}});assert.equal((await handle(request())).status,status);assert.equal(reads,0);});
test('owner can read, with private cache headers',async()=>{const r=await createHandler({getUser:async()=>owner,readSnapshot:async()=>sample()})(request());assert.equal(r.status,200);assert.match(r.headers.get('Cache-Control'),/no-store/);assert.equal(r.headers.get('Netlify-CDN-Cache-Control'),'no-store');assert.equal((await r.json()).schemaVersion,2);});
test('owner only receives a validated lead inbox store record',async()=>{
 const r=await createHandler({getUser:async()=>owner,readSnapshot:async()=>sample(),readLeadInbox:async()=>({...inboxPayload,events:[{...inboxPayload.events[0],rawPayload:'SECRET'}]})})(request());
 const body=await r.json(); assert.equal(body.leadInbox.events[0].rawPayload,undefined); assert.doesNotMatch(JSON.stringify(body),/SECRET/);
});
test('owner receives channel-health baseline without replacing genuine relay events',async()=>{
 const baseline={...inboxPayload,observedAt:'2026-09-28T00:00:00Z',sources:[{...inboxPayload.sources[0],state:'blocked'},{id:'forms',name:'Website forms',kind:'form',state:'not_connected',observedAt:'2026-09-28T00:00:00Z',detail:'No publisher',nextStep:'Connect it'}],events:[]};
 const live={...inboxPayload,sources:[{...inboxPayload.sources[0],state:'healthy',observedAt:'2026-09-28T01:00:00Z'}]};
 const r=await createHandler({getUser:async()=>owner,readSnapshot:async()=>sample(),readLeadInbox:async()=>live,readLeadInboxBaseline:async()=>baseline})(request());
 const body=await r.json(); assert.equal(body.leadInbox.sources.length,2); assert.equal(body.leadInbox.sources.find(source=>source.id==='gmail').state,'healthy'); assert.equal(body.leadInbox.events.length,1);
});
test('all writes fail before storage',async()=>{for(const method of ['POST','PUT','DELETE','PATCH']){const r=await createHandler({getUser:async()=>{throw Error('should not read');},readSnapshot:async()=>{throw Error('should not read');}})(request(method));assert.equal(r.status,405);}});
test('missing or invalid storage is unknown, never an empty healthy board',async()=>{for(const snapshot of [null,{}, {schemaVersion:1}]){const r=await createHandler({getUser:async()=>owner,readSnapshot:async()=>snapshot})(request());assert.equal(r.status,503);}});
test('storage and auth exceptions do not leak secrets',async()=>{for(const authFailure of [true,false]){const r=await createHandler({getUser:async()=>{if(authFailure)throw Error('SECRET');return owner;},readSnapshot:async()=>{throw Error('SECRET');}})(request());assert.ok([401,503].includes(r.status));assert.doesNotMatch(await r.text(),/SECRET/);}});
test('export permits selected fields only',()=>{const secret='NEVER_EXPORT_THIS';const s=projectSnapshot({generatedAt:'2026-09-20',episodes:[{id:'e',video:secret,stages:{blog:{state:'done',note:secret}}}],runtime:[{name:'Frank',tasks:secret}],sources:[{path:secret}]},{accounts:[{id:'a',loc:secret,results:{workflows:{returned:3,rows:[{name:secret}]}}}],sourceRecords:secret},{token:secret,operations:[{id:'o',log:secret}]});assert.doesNotMatch(JSON.stringify(s),new RegExp(secret));assert.equal(s.observedAt,'2026-09-20');assert.equal(s.accounts[0].counts.workflows.returned,3);});
test('lead inbox exports only viewer fields',()=>{const secret='NEVER_EXPORT_THIS';const s=projectSnapshot({},{},{leadInbox:{observedAt:'2026-09-27T12:00:00Z',sources:[{name:'Gmail',state:'attention',credential:secret}],events:[{id:'e',eventType:'incoming_message',contactName:'Test',message:'Need help',rawPayload:secret}]}});assert.equal(s.leadInbox.events[0].message,'Need help');assert.doesNotMatch(JSON.stringify(s),new RegExp(secret));});
test('fresh export never freshens old evidence; invalid and future clocks unknown',()=>{const now=Date.parse('2026-09-26T12:00:00Z');assert.equal(freshness('2026-09-26T11:55:00Z',now),'Recent');assert.equal(freshness('2026-09-20T11:55:00Z',now),'Stale');assert.equal(freshness(null,now),'Unknown');assert.equal(freshness('2027-01-01',now),'Unknown');});

import {inviteTokenFromLink} from '../lib/invite-link.mjs';
test('invitation setup accepts only the known project and current origin',()=>{
 assert.equal(inviteTokenFromLink('https://mcp.connorcoded.com/#invite_token=example','https://preview.example'),'example');
 for(const url of ['https://evil.example/#invite_token=example','https://mcp.connorcoded.com.evil.example/#invite_token=example','http://mcp.connorcoded.com/#invite_token=example','https://mcp.connorcoded.com/#recovery_token=example'])assert.throws(()=>inviteTokenFromLink(url,'https://preview.example'));
});

import {createLeadInboxIngest} from '../functions/lead-inbox-ingest.mjs';
const inboxPayload = {observedAt:'2026-09-27T22:00:00Z',sources:[{id:'gmail',name:'Gmail backup',kind:'email',state:'blocked',observedAt:'2026-09-27T22:00:00Z',detail:'Authorization failure',nextStep:'Identify the failing project'}],events:[{id:'gmail-1',occurredAt:'2026-09-27T21:59:00Z',eventType:'email_inquiry',source:'Gmail',contactName:'Test',message:'Please contact me',status:'new',contactUrl:'https://example.test/contact/1'}]};
const ingestRequest = (body=inboxPayload, headers={}) => new Request('https://preview.example/api/lead-inbox/ingest',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer test-key',...headers},body:JSON.stringify(body)});
test('lead inbox publisher requires its secret and stores only normalized records',async()=>{
 let saved; const handle=createLeadInboxIngest({getSecret:()=> 'test-key',readInbox:async()=>null,writeInbox:async value=>{saved=value;}});
 assert.equal((await handle(new Request('https://preview.example/api/lead-inbox/ingest',{method:'POST'}))).status,401);
 const response=await handle(ingestRequest({...inboxPayload,events:[{...inboxPayload.events[0],rawPayload:'SECRET'}]}));
 assert.equal(response.status,202); assert.equal(saved.events[0].rawPayload,undefined); assert.equal(saved.events[0].contactUrl,'https://example.test/contact/1');
});
test('lead inbox publisher rejects malformed input before storage',async()=>{
 let writes=0; const handle=createLeadInboxIngest({getSecret:()=> 'test-key',readInbox:async()=>null,writeInbox:async()=>{writes++;}});
 const bad={...inboxPayload,events:[{...inboxPayload.events[0],eventType:'not-real'}]};
 assert.equal((await handle(ingestRequest(bad))).status,400); assert.equal(writes,0);
});
test('lead inbox publisher keeps distinct events while updating a source',async()=>{
 let saved={...inboxPayload}; const handle=createLeadInboxIngest({getSecret:()=> 'test-key',readInbox:async()=>saved,writeInbox:async value=>{saved=value;}});
 const second={...inboxPayload,observedAt:'2026-09-27T23:00:00Z',sources:[{...inboxPayload.sources[0],state:'attention',observedAt:'2026-09-27T23:00:00Z'}],events:[{...inboxPayload.events[0],id:'gmail-2',occurredAt:'2026-09-27T22:59:00Z'}]};
 assert.equal((await handle(ingestRequest(second))).status,202); assert.equal(saved.sources.length,1); assert.equal(saved.sources[0].state,'attention'); assert.equal(saved.events.length,2);
});
