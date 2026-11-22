/* إحصائيات الموقع — Worker مستقل على Cloudflare Free
   لا يخزّن أي عنوان IP أو بريد أو بيانات شخصية.
   الزائر يُعرَّف بـ HMAC يومي غير قابل للفك، ويُحذف قديمه تلقائيًا. */

import { DurableObject } from 'cloudflare:workers';

const ALLOWED_ORIGIN = 'https://ahmedmokbel99.github.io';
const DAY_MS = 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();

function corsFor(origin) {
  if (origin !== ALLOWED_ORIGIN) return null;
  return {
    'access-control-allow-origin': ALLOWED_ORIGIN,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'Origin',
    'cache-control': 'no-store',
  };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function visitorKey(ip, secret) {
  if (!ip || !secret) return '';
  const day = new Date().toISOString().slice(0, 10);
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${ip}|${day}`));
    return Array.from(new Uint8Array(signature))
      .slice(0, 16)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    return '';
  }
}

export class Analytics extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        kind TEXT NOT NULL,
        project TEXT NOT NULL DEFAULT ''
      )
    `);
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS daily (
        key TEXT PRIMARY KEY,
        ts INTEGER NOT NULL
      )
    `);
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS hits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL
      )
    `);
  }

  async record(kind, project, visitor) {
    const now = Date.now();
    /* حماية بسيطة من الضغط المتكرر على نقطة النهاية */
    this.sql.exec('DELETE FROM hits WHERE ts < ?', now - 60_000);
    if (this.sql.exec('SELECT COUNT(*) AS c FROM hits').one().c >= 60) return false;
    this.sql.exec('INSERT INTO hits (ts) VALUES (?)', now);

    this.sql.exec('INSERT INTO events (ts, kind, project) VALUES (?, ?, ?)', now, kind, project);
    if (visitor) {
      this.sql.exec('INSERT OR IGNORE INTO daily (key, ts) VALUES (?, ?)', visitor, now);
      this.sql.exec('DELETE FROM daily WHERE ts < ?', now - 90 * DAY_MS);
    }
    return true;
  }

  async summary() {
    const now = Date.now();
    const startOfToday = Date.parse(`${new Date(now).toISOString().slice(0, 10)}T00:00:00.000Z`);

    const visits = this.sql.exec("SELECT COUNT(*) AS c FROM events WHERE kind = 'visit'").one().c;
    const visitors = this.sql.exec('SELECT COUNT(*) AS c FROM daily').one().c;
    const todayVisits = this.sql
      .exec("SELECT COUNT(*) AS c FROM events WHERE kind = 'visit' AND ts >= ?", startOfToday)
      .one().c;
    const todayVisitors = this.sql
      .exec('SELECT COUNT(*) AS c FROM daily WHERE ts >= ?', startOfToday)
      .one().c;

    const projects = {};
    for (const row of [
      ...this.sql.exec(
        "SELECT project, COUNT(*) AS c FROM events WHERE kind = 'project' AND project <> '' GROUP BY project ORDER BY c DESC, project ASC"
      ),
    ]) {
      projects[row.project] = row.c;
    }

    return { visits, visitors, todayVisits, todayVisitors, projects };
  }

  async fetch(request) {
    const path = new URL(request.url).pathname;

    if (request.method === 'GET' && path === '/summary') {
      return json(await this.summary());
    }

    if (request.method === 'POST' && path === '/event') {
      let body;
      try {
        body = await request.json();
      } catch (error) {
        return json({ ok: false }, 400);
      }
      const kind = asString(body?.kind);
      if (kind !== 'visit' && kind !== 'project') return json({ ok: false }, 400);
      const project = kind === 'project' ? asString(body?.project).slice(0, 160) : '';
      const visitor = kind === 'visit' ? asString(body?.visitor).slice(0, 64) : '';
      const ok = await this.record(kind, project, visitor);
      return json({ ok }, ok ? 200 : 429);
    }

    return json({ ok: false }, 404);
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';
    const cors = corsFor(origin);

    if (request.method === 'OPTIONS') {
      return cors ? new Response(null, { status: 204, headers: cors }) : json({ ok: false }, 403);
    }
    if (!cors) return json({ ok: false }, 403);
    if (request.method !== 'GET' && request.method !== 'POST') {
      return json({ ok: false }, 405, cors);
    }
    if (!env.ANALYTICS) return json({ ok: false }, 500, cors);

    const stub = env.ANALYTICS.get(env.ANALYTICS.idFromName('site-live'));
    const path = new URL(request.url).pathname;

    if (request.method === 'GET' && path === '/summary') {
      const result = await stub.fetch('https://analytics/summary');
      return json(await result.json(), 200, cors);
    }

    if (request.method === 'POST' && path === '/event') {
      const contentType = (request.headers.get('content-type') || '').toLowerCase();
      if (!contentType.startsWith('application/json')) return json({ ok: false }, 400, cors);
      const raw = await request.text();
      if (raw.length > 1024) return json({ ok: false }, 413, cors);

      let body;
      try {
        body = JSON.parse(raw);
      } catch (error) {
        return json({ ok: false }, 400, cors);
      }

      const ip = request.headers.get('cf-connecting-ip') || '';
      const visitor = await visitorKey(ip, env.ANALYTICS_SECRET);
      const result = await stub.fetch('https://analytics/event', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: body?.kind, project: body?.project, visitor }),
      });
      return json(await result.json(), result.status, cors);
    }

    return json({ ok: false }, 404, cors);
  },
};
