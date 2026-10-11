import 'dotenv/config';

const adminIds = new Set(
  (process.env.ADMIN_USER_IDS || '').split(',').map(value => value.trim()).filter(Boolean)
);

let accessMap = {};
try {
  accessMap = JSON.parse(process.env.VPS_ACCESS_MAP || '{}');
  if (!accessMap || Array.isArray(accessMap) || typeof accessMap !== 'object') {
    throw new Error('VPS_ACCESS_MAP must be a JSON object');
  }
} catch {
  console.error('VPS_ACCESS_MAP is invalid JSON. SSHX access will fail closed.');
  accessMap = {};
}

export function canAccessVps(discordUserId, vpsId) {
  if (adminIds.has(String(discordUserId))) return true;
  const allowed = accessMap[String(discordUserId)];
  return Array.isArray(allowed) && allowed.map(String).includes(String(vpsId));
}
