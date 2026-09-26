import fs from 'node:fs';
import {build} from 'esbuild';
fs.mkdirSync('hosted-control/public/assets',{recursive:true});
await build({entryPoints:['hosted-control/src/app.js'],bundle:true,format:'esm',platform:'browser',outfile:'hosted-control/public/assets/app.js',minify:true});
console.log('Built public shell and bundled sign-in client. Business data is not in the publish directory.');
