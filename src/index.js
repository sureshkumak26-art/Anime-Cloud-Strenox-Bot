import 'dotenv/config';
import { Client, Events, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { panelRequest, discoverApi, summarize } from './api.js';

if (!process.env.DISCORD_TOKEN) { console.error('DISCORD_TOKEN missing. Configure .env first.'); process.exit(1); }
const adminIds = new Set((process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean));
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const makeEmbed = (title, description, color = 0x5865F2) => new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();
const isAdmin = i => adminIds.has(i.user.id) || Boolean(i.memberPermissions?.has('Administrator'));

async function apiReply(i, method, path, body) {
  await i.deferReply({ ephemeral: true });
  try {
    const r = await panelRequest(method, path, body);
    await i.editReply({ embeds: [makeEmbed(`API ${r.status} • ${method} /${path}`, `\`\`\`json\n${summarize(r.data)}\n\`\`\``, 0x57F287)] });
  } catch (e) { await i.editReply({ embeds: [makeEmbed(`Panel API error${e.status ? ` • HTTP ${e.status}` : ''}`, e.message, 0xED4245)] }); }
}

client.once(Events.ClientReady, c => console.log(`Logged in as ${c.user.tag}; API base ${process.env.API_BASE_URL || 'https://vm.animecloudpanel.indevs.in/api/v1'}`));
client.on(Events.InteractionCreate, async i => {
  if (!i.isChatInputCommand()) return;
  try {
    if (i.commandName === 'ping') return i.reply({ embeds: [makeEmbed('Pong!', `Gateway latency: ${client.ws.ping}ms`)], ephemeral: true });
    if (i.commandName === 'help') return i.reply({ embeds: [makeEmbed('☁️ Anime Cloud • StrenoxCloud', '`/ping` — latency\n`/panel` — API health\n`/vps list` — list VPSes\n`/vps show id:<id>` — view VPS\n`/vps action` — guarded until route schema is verified\n`/apiinfo` — probe docs/metadata (admin)\n`/adminapi` — call documented route (admin)')], ephemeral: true });
    if (i.commandName === 'panel') return await apiReply(i, 'GET', 'health');
    if (i.commandName === 'apiinfo') {
      if (!isAdmin(i)) return i.reply({ content: 'Admin permission required.', ephemeral: true });
      await i.deferReply({ ephemeral: true });
      const results = await discoverApi();
      const output = results.map(r => `**${r.path}** — ${r.status || 'failed'}\n${r.error || r.type}`).join('\n\n').slice(0, 3800);
      return i.editReply({ embeds: [makeEmbed('API metadata discovery', output || 'No results', 0xFEE75C)] });
    }
    if (i.commandName === 'vps') {
      const sub = i.options.getSubcommand();
      if (sub === 'list') return await apiReply(i, 'GET', 'vps');
      if (sub === 'show') {
        const id = i.options.getString('id', true);
        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return i.reply({ content: 'Invalid VPS ID.', ephemeral: true });
        return await apiReply(i, 'GET', `vps/${id}`);
      }
      if (sub === 'action') {
        if (!isAdmin(i)) return i.reply({ content: 'Admin permission required.', ephemeral: true });
        return i.reply({ embeds: [makeEmbed('Action disabled until verified', 'The provided API overview does not specify the exact HTTP method, route, and payload for VPS actions. Verify the live API route map before enabling this to avoid unintended destructive operations.', 0xFEE75C)], ephemeral: true });
      }
    }
    if (i.commandName === 'adminapi') {
      if (!isAdmin(i)) return i.reply({ content: 'Admin permission required.', ephemeral: true });
      const method = i.options.getString('method', true);
      const path = i.options.getString('path', true);
      const raw = i.options.getString('json');
      let body;
      if (raw) { try { body = JSON.parse(raw); } catch { return i.reply({ content: 'Invalid JSON body.', ephemeral: true }); } }
      if (method === 'GET' && body !== undefined) return i.reply({ content: 'GET requests cannot include a JSON body.', ephemeral: true });
      const channelId = process.env.ADMIN_LOG_CHANNEL_ID;
      if (channelId) client.channels.fetch(channelId).then(ch => ch?.isTextBased() && ch.send({ embeds: [makeEmbed('Admin API audit', `${i.user.tag} requested ${method} /${path}`, 0xED4245)] })).catch(() => {});
      return await apiReply(i, method, path, body);
    }
  } catch (e) {
    console.error(`Command ${i.commandName} failed:`, e.message);
    if (!i.replied && !i.deferred) await i.reply({ content: 'Unexpected error; inspect PM2 logs.', ephemeral: true }).catch(() => {});
  }
});
client.on(Events.Error, e => console.error('Discord client error:', e));
process.on('unhandledRejection', e => console.error('Unhandled rejection:', e));
client.login(process.env.DISCORD_TOKEN);
