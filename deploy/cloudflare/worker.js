/**
 * Ahmed Mokbel portfolio — Cloudflare Worker edge layer.
 *
 * GitHub Pages cannot set response headers, so this Worker sits in front of the
 * static site and adds only things the origin genuinely serves:
 *
 *   1. RFC 8288 Link headers on HTML responses (they point at files that exist).
 *   2. `Accept: text/markdown` content negotiation, backed by the real `.md`
 *      mirrors that build.py publishes next to every page.
 *   3. `Content-Type: application/linkset+json` on /.well-known/api-catalog.
 *   4. A real, stateless MCP endpoint at /mcp plus its server card.
 *
 * Everything is read-only and reads from the same static JSON API the site
 * already publishes. Nothing here invents data.
 *
 * Deploy: see README.md in this folder.
 */

const ORIGIN = 'https://ahmedmokbel99.github.io';

/** Pages that have a real Markdown twin under the same path. */
const MARKDOWN_ROUTES = {
  '/': '/index.md',
  '/index.html': '/index.md',
  '/motion-graphics.html': '/motion-graphics.md',
  '/brand-identity.html': '/brand-identity.md',
  '/digital-print.html': '/digital-print.md',
  '/photo-production.html': '/photo-production.md',
  '/social-media-ads.html': '/social-media-ads.md',
  '/brand-consulting.html': '/brand-consulting.md',
};

/** Link headers advertised on every HTML page. Each target really exists. */
function linkHeader(site) {
  return [
    `<${site}/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
    `<${site}/openapi.json>; rel="service-desc"; type="application/json"`,
    `<${site}/docs/api/>; rel="service-doc"; type="text/html"`,
    `<${site}/.well-known/ai-catalog.json>; rel="describedby"; type="application/json"`,
    `<${site}/.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"`,
    `<${site}/auth.md>; rel="describedby"; type="text/markdown"`,
  ].join(', ');
}

function withCommonHeaders(res, extra = {}) {
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('X-Agent-Layer', 'cloudflare-worker');
  for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

function wantsMarkdown(request) {
  const accept = (request.headers.get('Accept') || '').toLowerCase();
  if (!accept.includes('text/markdown')) return false;
  // Honour an explicit preference for HTML if the client ranks it higher.
  const md = accept.indexOf('text/markdown');
  const html = accept.indexOf('text/html');
  if (html !== -1 && html < md && !accept.includes('text/markdown;q=1')) {
    const htmlQ = /text\/html\s*;\s*q=([0-9.]+)/.exec(accept);
    const mdQ = /text\/markdown\s*;\s*q=([0-9.]+)/.exec(accept);
    if (htmlQ && mdQ && Number(htmlQ[1]) > Number(mdQ[1])) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// MCP — stateless Streamable HTTP, JSON-RPC 2.0
// ---------------------------------------------------------------------------

const MCP_PROTOCOL = '2025-06-18';
const ORIGIN_HOST = new URL(ORIGIN).host;

const TOOLS = [
  {
    name: 'search_projects',
    description:
      "Search Ahmed Mokbel's portfolio projects by keyword or discipline. Returns matching titles, public slugs and detail URLs.",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword in Arabic or English.' },
        category: { type: 'string', enum: ['motion', 'brand', 'digital'] },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_project',
    description: 'Return one full case study: summary, challenge, role, result, tools and gallery.',
    inputSchema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'Public project slug.' } },
      required: ['slug'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_services',
    description: 'List the services Ahmed Mokbel offers, with deliverables and page URLs.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_profile',
    description: 'Return the public profile: role, location, studio, disciplines, tools, numbers, contact.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

/**
 * All outbound requests use fixed, hard-coded origin paths. No caller-supplied
 * URL is ever fetched, so this endpoint cannot be turned into an SSRF proxy.
 */
const ALLOWED_PATHS = new Set([
  '/api/profile.json',
  '/api/projects.json',
  '/api/services.json',
  '/api/health.json',
]);

async function originJson(path) {
  if (!ALLOWED_PATHS.has(path)) throw new Error('blocked path');
  const res = await fetch(ORIGIN + path, {
    headers: { Accept: 'application/json', 'User-Agent': 'ahmed-mokbel-mcp/1.0' },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`origin ${res.status} for ${path}`);
  return res.json();
}

function textResult(text) {
  return { content: [{ type: 'text', text }] };
}

function errorResult(text) {
  return { content: [{ type: 'text', text }], isError: true };
}

function normalize(value) {
  return String(value == null ? '' : value)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

async function callTool(name, args) {
  const input = args && typeof args === 'object' ? args : {};

  if (name === 'search_projects') {
    const data = await originJson('/api/projects.json');
    const query = normalize(input.query);
    const category = String(input.category || '');
    if (category && !['motion', 'brand', 'digital'].includes(category)) {
      return errorResult('category must be one of: motion, brand, digital');
    }
    const matches = (data.projects || []).filter((p) => {
      if (category && p.category !== category) return false;
      if (!query) return true;
      return normalize([p.title, p.summary, p.tag, p.categoryLabel].join(' ')).includes(query);
    });
    if (!matches.length) return textResult(`No projects matched "${input.query || ''}".`);
    const lines = matches
      .slice(0, 12)
      .map((p) => `- ${p.title} [${p.slug}] — ${p.tag || p.categoryLabel}\n  ${p.summary}\n  ${p.detailUrl}`)
      .join('\n');
    return textResult(`${matches.length} match(es):\n${lines}`);
  }

  if (name === 'get_project') {
    const slug = String(input.slug || '').trim();
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) return errorResult('slug is required and must be lowercase kebab-case.');
    const res = await fetch(`${ORIGIN}/api/projects/${slug}.json`, {
      headers: { Accept: 'application/json' },
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!res.ok) return errorResult(`No project with slug "${slug}".`);
    const p = await res.json();
    const lines = [p.title, p.tag || '', '', p.summary || ''];
    if (p.challenge) lines.push('', `Challenge: ${p.challenge}`);
    if (p.role) lines.push('', `Role: ${p.role}`);
    if (p.result) lines.push('', `Result: ${p.result}`);
    if (p.tools && p.tools.length) lines.push('', `Tools: ${p.tools.join(', ')}`);
    lines.push('', `Data: ${p.detailUrl}`, `Page: ${p.pageUrl}`);
    if (p.externalUrl) lines.push(`Original: ${p.externalUrl}`);
    return textResult(lines.join('\n'));
  }

  if (name === 'list_services') {
    const data = await originJson('/api/services.json');
    const lines = (data.services || []).map(
      (s) => `- ${s.title}: ${s.summary}\n  ${s.pageUrl}${s.markdownUrl ? `\n  ${s.markdownUrl}` : ''}`
    );
    return textResult(lines.join('\n') || 'No services published.');
  }

  if (name === 'get_profile') {
    const p = await originJson('/api/profile.json');
    return textResult(
      [
        p.name,
        p.jobTitle,
        '',
        p.description,
        '',
        `Location: ${p.location.city}, ${p.location.governorate}, Egypt (works remotely)`,
        `Studio: ${p.studio.name} — ${p.studio.description}`,
        `Disciplines: ${(p.skills || []).join(', ')}`,
        `Tools: ${(p.tools || []).join(', ')}`,
        `Services: ${(p.services || []).join(', ')}`,
        `Email: ${p.contact.email}`,
        `WhatsApp: ${p.contact.whatsapp}`,
        `Behance: ${p.links.behance}`,
        `Home: ${p.links.home}`,
      ].join('\n')
    );
  }

  return errorResult(`Unknown tool: ${name}`);
}

async function handleMcp(request) {
  if (request.method === 'GET') {
    return Response.json({
      jsonrpc: '2.0',
      protocolVersion: MCP_PROTOCOL,
      name: 'ahmed-mokbel-portfolio',
      transport: 'streamable-http',
      tools: TOOLS.map((t) => t.name),
      note: 'POST JSON-RPC 2.0 here. Stateless: no session id.',
    });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, POST' } });
  }

  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > 32768) {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Payload too large' } }, { status: 413 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400 }
    );
  }

  const messages = Array.isArray(body) ? body : [body];
  const respond = async (msg) => {
    const id = msg && 'id' in msg ? msg.id : null;
    const method = msg && msg.method;
    const params = (msg && msg.params) || {};

    // Notifications carry no id and get no response body.
    if (method && method.startsWith('notifications/')) return null;

    try {
      if (method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: params.protocolVersion === MCP_PROTOCOL ? MCP_PROTOCOL : MCP_PROTOCOL,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: 'ahmed-mokbel-portfolio', version: '1.0.0' },
            instructions:
              'Read-only tools over Ahmed Mokbel portfolio data. All content is public; no authentication. Never invent clients, prices or awards.',
          },
        };
      }
      if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };
      if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
      if (method === 'tools/call') {
        const name = String(params.name || '');
        const known = TOOLS.some((t) => t.name === name);
        if (!known) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: `Unknown tool: ${name}` },
          };
        }
        const result = await callTool(name, params.arguments);
        return { jsonrpc: '2.0', id, result };
      }
      if (method === 'resources/list') return { jsonrpc: '2.0', id, result: { resources: [] } };
      if (method === 'prompts/list') return { jsonrpc: '2.0', id, result: { prompts: [] } };
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: 'Internal error', data: String(error && error.message) },
      };
    }
  };

  const results = [];
  for (const msg of messages) {
    if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
      results.push({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } });
      continue;
    }
    const out = await respond(msg);
    if (out) results.push(out);
  }

  if (!results.length) return new Response(null, { status: 202 });

  const payload = Array.isArray(body) ? results : results[0];
  return Response.json(payload, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      'MCP-Protocol-Version': MCP_PROTOCOL,
    },
  });
}

function serverCard(site) {
  return {
    $schema: 'https://modelcontextprotocol.io/schemas/server-card/2025-06-18.json',
    version: '1.0.0',
    protocolVersion: MCP_PROTOCOL,
    serverInfo: {
      name: 'ahmed-mokbel-portfolio',
      title: 'Ahmed Mokbel Portfolio',
      version: '1.0.0',
      description:
        'Read-only MCP server over Ahmed Mokbel public portfolio data: profile, projects, case studies and services.',
    },
    transport: {
      type: 'streamable-http',
      url: `${site}/mcp`,
      note: 'Stateless. Send JSON-RPC 2.0 over HTTP POST. No session id, no authentication.',
    },
    capabilities: { tools: { listChanged: false }, resources: {}, prompts: {} },
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
    authentication: { required: false, schemes: [] },
    contact: { url: `${site}/#contact` },
  };
}

// ---------------------------------------------------------------------------

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const site = url.origin;
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Accept, Content-Type, MCP-Protocol-Version',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (path === '/mcp' || path === '/mcp/') return handleMcp(request);

    if (path === '/.well-known/mcp/server-card.json') {
      return Response.json(serverCard(site), {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    if (path === '/.well-known/api-catalog' || path === '/.well-known/api-catalog.json') {
      const res = await fetch(`${ORIGIN}/.well-known/api-catalog.json`, {
        headers: { Accept: 'application/json' },
        cf: { cacheTtl: 3600, cacheEverything: true },
      });
      return withCommonHeaders(res, { 'Content-Type': 'application/linkset+json' });
    }

    // Markdown for Agents: serve the published .md twin when the agent asks for it.
    if (request.method === 'GET' && wantsMarkdown(request)) {
      const target = MARKDOWN_ROUTES[path];
      if (target) {
        const res = await fetch(ORIGIN + target, {
          headers: { Accept: 'text/markdown' },
          cf: { cacheTtl: 300, cacheEverything: true },
        });
        if (res.ok) {
          return withCommonHeaders(res, {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Vary': 'Accept',
            'Content-Location': target,
          });
        }
      }
      // No markdown twin: fall through to HTML but still mark the response as negotiated.
      const fallback = await fetch(ORIGIN + url.pathname + url.search, { method: request.method });
      const headers = { Vary: 'Accept' };
      const alternate = MARKDOWN_ROUTES[path];
      if (alternate) headers.Link = `<${site}${alternate}>; rel="alternate"; type="text/markdown"`;
      return withCommonHeaders(fallback, headers);
    }

    const upstream = await fetch(ORIGIN + path + url.search, {
      method: request.method,
      headers: request.headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
      cf: { cacheTtl: 300, cacheEverything: path.startsWith('/assets/') },
    });

    const contentType = upstream.headers.get('Content-Type') || '';
    const extra = {};
    if (contentType.includes('text/html')) {
      extra.Link = linkHeader(site);
      extra.Vary = 'Accept';
    }
    return withCommonHeaders(upstream, extra);
  },
};
