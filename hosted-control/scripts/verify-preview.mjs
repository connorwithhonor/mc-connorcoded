import assert from 'node:assert/strict';
import fs from 'node:fs';
const [base,out]=process.argv.slice(2);
if(!base?.match(/^https:\/\/[a-z0-9]+--mc-connor\.netlify\.app$/))throw Error('Pass the immutable preview URL, without a trailing slash.');
const results=[];
for(const [p,method,expected] of [['/','GET',200],['/api/control-status','GET',401],['/api/control-status','POST',405],['/.netlify/functions/control-status','GET',404],['/snapshot.json','GET',404],['/content/snapshot.json','GET',404],['/private/snapshot.json','GET',404]]){
 const r=await fetch(base+p,{method,signal:AbortSignal.timeout(20000)});assert.equal(r.status,expected,p);if(p==='/api/control-status')assert.match(r.headers.get('cache-control'),/no-store/);results.push({path:p,method,status:r.status,cache:r.headers.get('cache-control')});
}
const forged=await fetch(base+'/api/control-status',{headers:{Cookie:'nf_jwt=invalid-test-token'},signal:AbortSignal.timeout(20000)});assert.equal(forged.status,401);results.push({path:'/api/control-status',check:'invalid session',status:forged.status});
const receipt={at:new Date().toISOString(),preview:base,checks:results,ownerLogin:'NOT_TESTED: Identity activation and owner invitation pending',businessDataUploaded:false};
if(out)fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
