// Parse locally. Never fetch or log an invitation URL or token.
export function inviteTokenFromLink(value,currentOrigin) {
 let url;try{url=new URL(value);}catch{throw Error('Paste the full invitation link from the Netlify email.');}
 const allowed=new Set(['https://mcp.connorcoded.com','https://mc.connorcoded.com',currentOrigin]);
 if(url.protocol!=='https:' || !allowed.has(url.origin))throw Error('Use the invitation for this control room, not another site.');
 const token=new URLSearchParams(url.hash.slice(1)).get('invite_token');
 if(!token || token.length>2000)throw Error('This link does not contain a valid invitation.');
 return token;
}
