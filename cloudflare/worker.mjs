export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/control-status') {
      return new Response(JSON.stringify({ authorized: false, error: 'Private Cloudflare access is not configured yet.' }), {
        status: 401,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'vary': 'Cookie, Authorization' },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
