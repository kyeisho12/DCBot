/**
 * weeklyreport.js
 * ---------------
 * Admin-only slash command: /weeklyreport
 * Reads current week data from Google Sheets, groups by user, sorts by hours,
 * and outputs a leaderboard. Restricted to administrators.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const sheetsService = require('../services/sheetsService');
const { safeReply } = require('../utils/safeReply');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weeklyreport')
    .setDescription('View weekly work hours leaderboard (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const reportData = await sheetsService.getWeeklyReportData();

      if (reportData.length === 0) {
        await interaction.editReply({
          content: '**Weekly Work Report**\n\nNo hours recorded for this week.',
        });
        return;
      }

      const lines = reportData.map((e) => `${e.username} — ${e.totalHours} hrs`);
      const leaderboard = lines.join('\n');
      await interaction.editReply({
        content: `**Weekly Work Report**\n\n${leaderboard}`,
      });
      logger.info('command', `weeklyreport: ${reportData.length} users`);
    } catch (err) {
      logger.error('command', 'weeklyreport failed:', err.message);
      await safeReply(interaction, err.message || 'Failed to load weekly report.');
    }
  },
};
