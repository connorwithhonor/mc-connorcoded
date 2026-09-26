import fs from 'node:fs';
import path from 'node:path';
import {projectSnapshot} from '../lib/snapshot.mjs';
const [deck,out] = process.argv.slice(2);
if(!deck || !out) throw Error('Usage: node hosted-control/scripts/export.mjs /absolute/macv-deck /private/output.json');
if(path.resolve(out).startsWith(path.resolve('hosted-control/public')+'/'))throw Error('Private data cannot be exported into the publish directory.');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const c=read(path.join(deck,'content/snapshot.json')),r=read(path.join(deck,'revenue/snapshot.json'));
// A failed control read is explicit. Never export the local CSRF token or raw response.
let control={};
try{const response=await fetch('http://127.0.0.1:7878/api/control',{signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error();control=await response.json();}catch{r.errors=[...(r.errors||[]),'control unavailable'];}
fs.writeFileSync(out,JSON.stringify(projectSnapshot(c,r,control),null,2),{mode:0o600});
console.log('Private read model exported. No upload, send, or ledger write.');
