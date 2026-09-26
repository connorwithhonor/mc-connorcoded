import fs from 'node:fs/promises';
import path from 'node:path';
import {projectSnapshot} from './snapshot.mjs';
export async function readLocalSources(deck,{fetcher=fetch}={}) {
 const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
 const [content,revenue]=await Promise.all([read(path.join(deck,'content/snapshot.json')),read(path.join(deck,'revenue/snapshot.json'))]);
 let control={};
 try{const r=await fetcher('http://127.0.0.1:7878/api/control',{signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error();control=await r.json();}catch{revenue.errors=[...(revenue.errors||[]),'Local control service unavailable'];}
 const snapshot=projectSnapshot(content,revenue,control);
 snapshot.localControlsAvailable=Array.isArray(control.operations);
 return snapshot;
}
