// A read model of existing records, never a second task ledger.
const fields = (row, keys) => Object.fromEntries(keys.map(k => [k, row?.[k] ?? null]));
export function projectSnapshot(content, revenue, control = {}) {
  return {
    schemaVersion: 1, exportedAt: new Date().toISOString(),
    source: 'connor-palace/mission-control/mission-control.json',
    observedAt: content.generatedAt || null, focusUpdatedAt: content.focus?.updatedAt || null,
    revenueObservedAt: revenue.liveObservedAt || null,
    focus: (content.focus?.priorities || []).slice(0, 3).map(p => fields(p, ['id','businessId','title','outcome','next','proof','tasks'])),
    businesses: [...new Map([...(content.businesses || []), ...(revenue.accountMap || []).filter(a => !(content.businesses || []).some(b => b.id === a.id))].map(b => [b.id, {...fields(b, ['id','name','kind','destination']), name:b.id==='sellersonlyagent'?'Sellers Only Agent™':b.name}])).values()],
    episodes: (content.episodes || []).map(e => ({...fields(e,['id','title','date','businessIds']), stages: Object.fromEntries(Object.entries(e.stages || {}).map(([k,v]) => [k, fields(v,['state','url','owner'])]))})),
    tasks: [...new Map([...(content.engines || []).flatMap(e => e.tasks || []), ...(revenue.tasks || [])].map(t => [t.id, fields(t,['id','name','status','owner','nextStep','lastUpdate','gates'])])).values()],
    accounts: (revenue.accounts || []).map(a => ({...fields(a,['id','name','observedAt','error']), counts: Object.fromEntries(Object.entries(a.results || {}).map(([k,v]) => [k, v.error ? {error: String(v.error)} : {returned:v.returned,limited:v.limited === true}]))})),
    operations: (control.operations || []).map(o => fields(o,['id','taskId','businessId','owner','phase','nextStep','dueAt','createdAt','updatedAt','finishedAt'])),
    workers: (content.runtime || []).map(w => fields(w,['name','reachable','observedAt'])),
    issues: [...(content.errors || []), ...(revenue.errors || [])].map(() => 'A source could not be read. Check its local control room.'),
    connections: {ranking:'Not connected: Claude ranking feed needs a verified contract.',dispatch:'Not connected: remote worker dispatch has not passed an end-to-end check.'}
  };
}
export function freshness(timestamp, now = Date.now(), maxAge = 30 * 60000) {
  const age = now - Date.parse(timestamp);
  if (!Number.isFinite(age) || age < -60000) return 'Unknown';
  return age > maxAge ? 'Stale' : 'Recent';
}
export function validSnapshot(s) {
  return s?.schemaVersion === 1 && ['focus','businesses','episodes','tasks','accounts','operations','workers'].every(k => Array.isArray(s[k]));
}
