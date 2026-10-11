import 'dotenv/config';
import { panelRequest } from './api.js';

const PLAN_IDS = new Set(['starter', 'basic', 'pro', 'ultra']);
const OS_IDS = new Set(['ubuntu-24.04', 'ubuntu-22.04', 'debian-12']);

export async function createVpsForDiscordUser({ user, plan, os, requestId }) {
  if (!PLAN_IDS.has(plan) || !OS_IDS.has(os)) throw new Error('Unsupported VPS plan or OS.');
  const path = process.env.VPS_CREATE_API_PATH || 'integrations/discord/vps/create';
  const { data } = await panelRequest('POST', path, {
    discord_user_id: user.id,
    discord_username: user.username,
    plan,
    os,
    request_id: requestId
  });
  const vps = data?.vps || data?.data?.vps;
  if (data?.success !== true || !vps || vps.id == null) {
    throw new Error(data?.error || 'Panel did not confirm VPS creation. Check the panel bridge and provisioning logs.');
  }
  return vps;
}

export function formatVpsDetails(vps) {
  const fields = [
    ['VM ID', vps.id],
    ['Name', vps.name],
    ['Status', vps.status],
    ['OS', vps.os],
    ['Plan', vps.plan],
    ['IP address', vps.ip],
    ['SSH port', vps.ssh_port],
    ['Linux username', vps.username],
    ['RAM', vps.ram_mb != null ? `${vps.ram_mb} MB` : undefined],
    ['vCPU', vps.vcpus],
    ['Disk', vps.disk_gb != null ? `${vps.disk_gb} GB` : undefined],
    ['One-time password', vps.initial_password]
  ];
  const lines = fields.filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => `**${label}:** ${String(value).replace(/[`*_~|>]/g, '')}`);
  if (vps.password_change_required) lines.push('**Important:** Change the one-time password immediately after first login.');
  lines.push('Keep these details private. Do not share this DM or password.');
  return lines.join('\n').slice(0, 4000);
}
