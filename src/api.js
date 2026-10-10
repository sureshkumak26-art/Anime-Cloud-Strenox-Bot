import 'dotenv/config';

const base = (process.env.API_BASE_URL || 'https://vm.animecloudpanel.indevs.in/api/v1').replace(/\/+$/, '');
const apiKey = process.env.API_KEY || '';
const timeoutMs = Number(process.env.API_TIMEOUT_MS || 15000);

export class PanelApiError extends Error {
  constructor(message, status = 0, body = null) { super(message); this.name = 'PanelApiError'; this.status = status; this.body = body; }
}

export async function panelRequest(method, path, body) {
  if (!apiKey) throw new PanelApiError('API_KEY is missing in .env');
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw new PanelApiError('Unsupported HTTP method');
  const cleanPath = String(path || '').replace(/^\/+/, '');
  if (!cleanPath || cleanPath.includes('..') || /^https?:/i.test(cleanPath) || cleanPath.includes('\\') || cleanPath.includes('?')) throw new PanelApiError('Invalid API path');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${base}/${cleanPath}`, {
      method,
      headers: { 'X-API-Key': apiKey, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: controller.signal
    });
    const raw = await response.text();
    let data;
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw: raw.slice(0, 1200) }; }
    if (!response.ok || data?.success === false) throw new PanelApiError(data?.error || data?.message || `Panel API returned HTTP ${response.status}`, response.status, data);
    return { status: response.status, data };
  } catch (err) {
    if (err.name === 'AbortError') throw new PanelApiError(`Panel API timed out after ${timeoutMs}ms`);
    if (err instanceof PanelApiError) throw err;
    throw new PanelApiError(`Panel API request failed: ${err.message}`);
  } finally { clearTimeout(timer); }
}

export async function discoverApi() {
  const candidates = (process.env.API_DOC_PATHS || '/openapi.json,/api/openapi.json,/docs,/info,/health').split(',').map(s => s.trim()).filter(Boolean);
  const results = [];
  for (const path of candidates) {
    try {
      const { status, data } = await panelRequest('GET', path);
      const spec = Boolean(data && (data.openapi || data.swagger || data.paths));
      results.push({ path, status, type: spec ? 'OpenAPI/Swagger spec' : 'JSON response', data });
      if (spec) break;
    } catch (e) { results.push({ path, status: e.status || 0, error: e.message }); }
  }
  return results;
}

export function summarize(value, max = 3500) {
  const str = JSON.stringify(value, null, 2);
  return str.length > max ? `${str.slice(0, max)}\n… (truncated)` : str;
}
