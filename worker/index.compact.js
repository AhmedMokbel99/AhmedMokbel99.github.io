import { DurableObject } from 'cloudflare:workers';
const ALLOWED_ORIGIN = 'https://ahmedmokbel99.github.io';
const EXPECTED_HOSTNAME = 'ahmedmokbel99.github.io';
const TURNSTILE_ACTION = 'contact_form';
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_BODY_BYTES = 8192;
const TG_TRIES = 3;
const TG_TIMEOUT = 2000;
const LIMIT_MINUTE = 5;
const LIMIT_HOUR = 20;
const WHATSAPP = '201228084197';
const SUBJECT = 'طلب مشروع جديد — من الموقع الشخصي';
const SERVICES = new Set([
'موشن جرافيك',
'هوية بصرية كاملة',
'تصميم رقمي وطباعي',
'تصوير وإنتاج إعلاني',
'إعلانات السوشيال ميديا',
'استشارات وتطوير بصري',
'أخرى',
]);
const SPAM_PHRASES = [
'viagra',
'casino',
'lottery',
'free money',
'click here',
'buy followers',
'ربح مضمون',
'عملة رقمية مجانية',
'تخفيضات حصرية الآن',
];
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function corsFor(origin) {
if (origin !== ALLOWED_ORIGIN) return null;
return {
'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
'Access-Control-Allow-Methods': 'POST, OPTIONS',
'Access-Control-Allow-Headers': 'content-type',
'Access-Control-Max-Age': '86400',
Vary: 'Origin',
};
}
function json(body, status, cors = null, extra = {}) {
return new Response(JSON.stringify(body), {
status,
headers: {
'Content-Type': 'application/json; charset=utf-8',
'Cache-Control': 'no-store',
'X-Content-Type-Options': 'nosniff',
'Referrer-Policy': 'no-referrer',
...(cors || {}),
...extra,
},
});
}
const log = (reason) =>
console.warn(JSON.stringify({ event: 'rejected', reason, at: new Date().toISOString() }));
function str(value) {
return typeof value === 'string' ? value.trim() : '';
}
async function readBody(request) {
const declared = Number(request.headers.get('content-length') || 0);
if (declared > MAX_BODY_BYTES) return { tooLarge: true };
const reader = request.body?.getReader();
if (!reader) return { tooLarge: false, text: '' };
let bytes = 0;
let text = '';
while (true) {
const { done, value } = await reader.read();
if (done) break;
bytes += value.byteLength;
if (bytes > MAX_BODY_BYTES) {
await reader.cancel();
return { tooLarge: true };
}
text += decoder.decode(value, { stream: true });
}
text += decoder.decode();
return { tooLarge: false, text };
}
function clientIp(request) {
const cfIp = request.headers.get('cf-connecting-ip');
if (cfIp) return cfIp.trim();
const forwarded = request.headers.get('x-forwarded-for') || '';
return forwarded.split(',')[0].trim() || 'unknown';
}
async function hashIp(ip, secret) {
const key = await crypto.subtle.importKey(
'raw',
encoder.encode(secret),
{ name: 'HMAC', hash: 'SHA-256' },
false,
['sign']
);
const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(ip));
return Array.from(new Uint8Array(signature))
.map((byte) => byte.toString(16).padStart(2, '0'))
.join('');
}
function validate(payload) {
const values = {
name: str(payload.name),
phone: str(payload.phone),
email: str(payload.email),
service: str(payload.service),
message: str(payload.message),
};
const invalid = [];
if (values.name.length < 2 || values.name.length > 80) invalid.push('name');
if (!/^[0-9+\s()\-]{7,20}$/.test(values.phone)) invalid.push('phone');
if (
values.email &&
(values.email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email))
) {
invalid.push('email');
}
if (!SERVICES.has(values.service)) invalid.push('service');
if (values.message.length < 10 || values.message.length > 2000) invalid.push('message');
return { values, invalid };
}
function spam(message) {
const lower = message.toLowerCase();
const links = lower.match(/(https?:\/\/|www\.|t\.me\/)/g) || [];
if (links.length > 2) return 'spam_links';
if (SPAM_PHRASES.some((phrase) => lower.includes(phrase))) return 'spam_phrase';
const words = lower.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
if (words.length >= 12) {
const counts = new Map();
for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);
const top = Math.max(...counts.values());
if (top / words.length > 0.45) return 'spam_repeat';
}
if (/(.)\1{9,}/u.test(message)) return 'spam_repeat_chars';
return null;
}
function makeRef() {
const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const bytes = new Uint8Array(4);
crypto.getRandomValues(bytes);
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const suffix = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
return `AM-${date}-${suffix}`;
}
function clean(text) {
return String(text).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}
async function verifyTG(token, ip, env) {
const body = new URLSearchParams();
body.set('secret', env.TURNSTILE_SECRET_KEY);
body.set('response', token);
body.set('remoteip', ip);
const response = await fetch(TURNSTILE_VERIFY_URL, {
method: 'POST',
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body,
signal: AbortSignal.timeout(8000),
});
if (!response.ok) throw new Error('siteverify_http_error');
const data = await response.json();
if (data.success !== true) return false;
if (data.hostname && data.hostname !== EXPECTED_HOSTNAME) return false;
if (data.action && data.action !== TURNSTILE_ACTION) return false;
if (data.cdata && typeof data.cdata === 'string' && data.cdata.includes(ip)) return false;
return true;
}
async function notifyTG(env, text) {
const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
const body = JSON.stringify({
chat_id: env.TELEGRAM_CHAT_ID,
text,
disable_web_page_preview: true,
});
for (let i = 0; i < TG_TRIES; i += 1) {
let retry = false;
try {
const response = await fetch(url, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body,
signal: AbortSignal.timeout(TG_TIMEOUT),
});
if (response.ok) return;
retry = response.status === 429 || response.status >= 500;
} catch {
retry = true;
}
if (!retry) break;
if (i < TG_TRIES - 1) {
await new Promise((v) => setTimeout(v, 150 * (i + 1)));
}
}
throw new Error('telegram_delivery_failed');
}
function buildNote(values, ref, contactEmail) {
const replyLink = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`مرجع الطلب: ${ref}`)}`;
return clean(
[
`${SUBJECT} [${ref}]`,
'',
`الاسم: ${values.name}`,
`الهاتف: ${values.phone}`,
`البريد: ${values.email || 'غير مذكور'}`,
`نوع الخدمة: ${values.service}`,
'',
'تفاصيل المشروع:',
values.message,
'',
'بيانات الرد:',
`واتساب: ${replyLink}`,
`البريد: ${clean(contactEmail)}`,
'الرد المتوقع خلال 24 ساعة.',
].join('\n')
);
}
export class RateLimiter extends DurableObject {
constructor(ctx, env) {
super(ctx, env);
this.sql = ctx.storage.sql;
this.sql.exec(`
CREATE TABLE IF NOT EXISTS hits (
id INTEGER PRIMARY KEY AUTOINCREMENT,
ts INTEGER NOT NULL
)
`);
}
async check() {
const now = Date.now();
this.sql.exec('DELETE FROM hits WHERE ts < ?', now - 60 * 60 * 1000);
const minute = this.sql
.exec('SELECT COUNT(*) AS count FROM hits WHERE ts > ?', now - 60 * 1000)
.one().count;
const hour = this.sql.exec('SELECT COUNT(*) AS count FROM hits').one().count;
if (minute >= LIMIT_MINUTE || hour >= LIMIT_HOUR) return false;
this.sql.exec('INSERT INTO hits (ts) VALUES (?)', now);
return true;
}
async fetch() {
const allowed = await this.check();
return json({ allowed }, allowed ? 200 : 429);
}
}
export default {
async fetch(request, env) {
const origin = request.headers.get('origin') || '';
const cors = corsFor(origin);
if (request.method === 'OPTIONS') {
return cors
? new Response(null, { status: 204, headers: cors })
: json({ ok: false, error: 'forbidden' }, 403);
}
if (!cors) {
log('bad_origin');
return json({ ok: false, error: 'forbidden' }, 403);
}
if (request.method !== 'POST') {
return json({ ok: false, error: 'method_not_allowed' }, 405, cors, { Allow: 'POST, OPTIONS' });
}
if (
!env.TURNSTILE_SECRET_KEY ||
!env.TELEGRAM_BOT_TOKEN ||
!env.TELEGRAM_CHAT_ID ||
!env.CONTACT_EMAIL ||
!env.IP_HASH_SECRET ||
!env.RATE_LIMITER
) {
log('missing_config');
return json({ ok: false, error: 'server_error' }, 503, cors);
}
const ip = clientIp(request);
const ipHash = await hashIp(ip, env.IP_HASH_SECRET);
const limiter = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(ipHash));
const limitResponse = await limiter.fetch('https://rate-limiter/check');
if (!limitResponse.ok) {
log('rate_limited');
return json({ ok: false, error: 'rate_limited' }, 429, cors);
}
const ct = (request.headers.get('content-type') || '').toLowerCase();
if (!ct.startsWith('application/json')) {
log('bad_content_type');
return json({ ok: false, error: 'bad_request' }, 400, cors);
}
const body = await readBody(request);
if (body.tooLarge) {
log('body_too_large');
return json({ ok: false, error: 'payload_too_large' }, 413, cors);
}
let payload;
try {
payload = JSON.parse(body.text);
} catch {
log('invalid_json');
return json({ ok: false, error: 'bad_request' }, 400, cors);
}
if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
log('invalid_payload');
return json({ ok: false, error: 'bad_request' }, 400, cors);
}
const ref = makeRef();
if (str(payload.botcheck)) {
log('honeypot');
return json({ ok: true, ref }, 200, cors);
}
const { values, invalid } = validate(payload);
if (invalid.length) {
log('invalid_fields');
return json({ ok: false, error: 'bad_request' }, 400, cors);
}
const spam = spam(values.message);
if (spam) {
log(spam);
return json({ ok: false, error: 'bad_request' }, 400, cors);
}
const token = str(payload['cf-turnstile-response']);
if (!token) {
log('missing_turnstile');
return json({ ok: false, error: 'verification_required' }, 400, cors);
}
try {
const verified = await verifyTG(token, ip, env);
if (!verified) {
log('turnstile_failed');
return json({ ok: false, error: 'verification_failed' }, 403, cors);
}
await notifyTG(env, buildNote(values, ref, env.CONTACT_EMAIL));
} catch {
log('delivery_failed');
return json({ ok: false, error: 'server_error' }, 503, cors);
}
return json({ ok: true, ref }, 200, cors);
},
};
