import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './commands.js';

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) { console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env'); process.exit(1); }
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
try {
  const route = DISCORD_GUILD_ID ? Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID) : Routes.applicationCommands(DISCORD_CLIENT_ID);
  const result = await rest.put(route, { body: commands });
  console.log(`Registered ${result.length} slash commands${DISCORD_GUILD_ID ? ' to test guild' : ' globally'}.`);
} catch (e) { console.error('Command registration failed:', e.message); process.exit(1); }
