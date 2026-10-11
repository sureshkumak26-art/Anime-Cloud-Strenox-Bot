import 'dotenv/config';
import { panelRequest } from './api.js';

function validateSshxUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Panel did not return a valid SSHX URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('SSHX URL must use HTTPS and cannot contain embedded credentials.');
  }
  const allowedHosts = (process.env.SSHX_ALLOWED_HOSTS || 'sshx.io')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  const host = url.hostname.toLowerCase();
  const allowed = allowedHosts.some(item => item.startsWith('*.')
    ? host.endsWith(item.slice(1)) && host !== item.slice(2)
    : host === item);
  if (!allowed) throw new Error('SSHX URL host is not in SSHX_ALLOWED_HOSTS.');
  return url.toString();
}

export async function createSshxSession(vpsId, discordUserId) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(String(vpsId))) throw new Error('Invalid VPS ID.');
  const template = process.env.SSHX_API_PATH_TEMPLATE || 'integrations/discord/vps/{id}/sshx';
  if (!template.includes('{id}')) throw new Error('SSHX_API_PATH_TEMPLATE must include {id}.');
  const path = template.replaceAll('{id}', encodeURIComponent(String(vpsId)));
  const { data } = await panelRequest('POST', path, { discord_user_id: String(discordUserId) });
  const url = data?.ssh_url || data?.web_url || data?.url || data?.data?.ssh_url || data?.data?.url;
  if (!url) throw new Error('Panel response did not include ssh_url, web_url, or url.');
  return validateSshxUrl(url);
}
