import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
  new SlashCommandBuilder().setName('help').setDescription('Show command help'),
  new SlashCommandBuilder().setName('panel').setDescription('Check panel API health'),
  new SlashCommandBuilder().setName('apiinfo').setDescription('Probe API metadata/docs paths (admin)').setDMPermission(false).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('vps').setDescription('VPS tools')
    .addSubcommand(s => s.setName('list').setDescription('List VPSes (GET /vps)'))
    .addSubcommand(s => s.setName('show').setDescription('View VPS (GET /vps/{id})').addStringOption(o => o.setName('id').setDescription('VPS ID').setRequired(true)))
    .addSubcommand(s => s.setName('action').setDescription('VPS action placeholder; enable after verifying live route schema')
      .addStringOption(o => o.setName('id').setDescription('VPS ID').setRequired(true))
      .addStringOption(o => o.setName('action').setDescription('Requested action').setRequired(true).addChoices(
        {name:'start',value:'start'},{name:'stop',value:'stop'},{name:'restart',value:'restart'},{name:'reset',value:'reset'}))),
  new SlashCommandBuilder().setName('adminapi').setDescription('Call a documented API route (admin only)').setDMPermission(false).setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('method').setDescription('HTTP method').setRequired(true).addChoices({name:'GET',value:'GET'},{name:'POST',value:'POST'},{name:'PUT',value:'PUT'},{name:'PATCH',value:'PATCH'},{name:'DELETE',value:'DELETE'}))
    .addStringOption(o => o.setName('path').setDescription('Relative path after /api/v1, e.g. users').setRequired(true))
    .addStringOption(o => o.setName('json').setDescription('Optional JSON body').setRequired(false))
].map(c => c.toJSON());
