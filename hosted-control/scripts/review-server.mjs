// Local review only. This file is outside the Netlify functions and publish directories.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHandler} from '../lib/handler.mjs';
const [snapshotPath,mode] = process.argv.slice(2);
if(!snapshotPath || !['--review','--locked'].includes(mode))throw Error('Provide private snapshot path and --review or --locked.');
const root=path.resolve('hosted-control/public');
const handler=createHandler({getUser:async()=>mode==='--review'?{id:'local-review',confirmedAt:'local',roles:['control-owner']}:null,readSnapshot:async()=>JSON.parse(await fs.readFile(snapshotPath,'utf8'))});
http.createServer(async(req,res)=>{
 if(!['127.0.0.1:7881','localhost:7881'].includes(req.headers.host)){res.writeHead(403);res.end();return;}
 const url=new URL(req.url,'http://127.0.0.1:7881');
 if(url.pathname==='/api/control-status'){const r=await handler(new Request(url,{method:req.method}));res.writeHead(r.status,{...Object.fromEntries(r.headers),'X-Control-Review':'local'});res.end(await r.text());return;}
 if(url.pathname.startsWith('/.netlify/identity')){res.writeHead(404,{'Content-Type':'application/json'});res.end('{}');return;}
 try{const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+'/'))throw Error();const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end();}
}).listen(7881,'127.0.0.1',()=>console.log('Local review on http://127.0.0.1:7881 · '+mode+' · not deployed'));
