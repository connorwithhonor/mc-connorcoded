import {timingSafeEqual} from 'node:crypto';

const sourceFields = ['id','name','kind','state','observedAt','detail','nextStep'];
const eventFields = ['id','occurredAt','eventType','source','businessId','businessName','contactName','phone','email','message','intent','status','contactUrl'];
const sourceStates = new Set(['healthy','attention','blocked','unknown','not_connected']);
const eventTypes = new Set(['incoming_lead','incoming_message','chatbot_interaction','email_inquiry','signup','form_submission','other']);
const eventStatuses = new Set(['new','reviewing','matched','closed','unknown']);
const max = {id:120,name:160,kind:80,state:32,observedAt:40,detail:600,nextStep:600,occurredAt:40,eventType:48,source:160,businessId:120,businessName:160,contactName:160,phone:80,email:254,message:4000,intent:240,status:32,contactUrl:2048};

const cleanText = (value, key, {required=false}={}) => {
  if (typeof value !== 'string') return required ? null : null;
  const text = value.trim();
  if (!text || text.length > max[key]) return required ? null : null;
  return text;
};
const validTime = value => typeof value === 'string' && value.length <= max.observedAt && Number.isFinite(Date.parse(value));
const select = (row, keys) => Object.fromEntries(keys.map(key => [key, cleanText(row?.[key], key)]));
const httpsUrl = value => {
  const text = cleanText(value, 'contactUrl');
  if (!text) return null;
  try { return new URL(text).protocol === 'https:' ? text : null; } catch { return null; }
};

export function normalizeLeadInbox(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Invalid lead inbox payload.');
  if (!validTime(input.observedAt)) throw Error('A valid observedAt timestamp is required.');
  const sources = Array.isArray(input.sources) ? input.sources : [];
  const events = Array.isArray(input.events) ? input.events : [];
  if (sources.length > 80 || events.length > 250) throw Error('The lead inbox batch is too large.');
  const cleanSources = sources.map(row => {
    const value = select(row, sourceFields);
    if (!value.id || !value.name || !value.kind || !sourceStates.has(value.state) || !validTime(value.observedAt)) throw Error('A source record is invalid.');
    return value;
  });
  const cleanEvents = events.map(row => {
    const value = select(row, eventFields);
    if (!value.id || !value.source || !eventTypes.has(value.eventType) || !validTime(value.occurredAt)) throw Error('An event record is invalid.');
    if (value.status && !eventStatuses.has(value.status)) throw Error('An event status is invalid.');
    value.contactUrl = httpsUrl(row?.contactUrl);
    return value;
  });
  return {observedAt: input.observedAt, sources: cleanSources, events: cleanEvents};
}

export function mergeLeadInbox(existing, received) {
  const prior = existing && typeof existing === 'object' ? existing : {sources: [], events: []};
  const sources = new Map((Array.isArray(prior.sources) ? prior.sources : []).map(row => [row.id, row]));
  for (const row of received.sources) sources.set(row.id, row);
  const events = new Map((Array.isArray(prior.events) ? prior.events : []).map(row => [row.id, row]));
  for (const row of received.events) events.set(row.id, row);
  return {
    observedAt: received.observedAt,
    sources: [...sources.values()].sort((a,b) => String(b.observedAt).localeCompare(String(a.observedAt))).slice(0,80),
    events: [...events.values()].sort((a,b) => String(b.occurredAt).localeCompare(String(a.occurredAt))).slice(0,250)
  };
}

export function authorized(request, expected) {
  const supplied = request.headers.get('authorization');
  if (!expected || !supplied?.startsWith('Bearer ')) return false;
  const received = supplied.slice(7);
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
