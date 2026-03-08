/**
 * clockin.js
 * ----------
 * Slash command: /clockin
 * Records clock-in time in memory (written to ClockLog on clock-out).
 * Validation: prevents double clock-in (no new clock-in while one is active).
 */

const { SlashCommandBuilder } = require('discord.js');
const sheetsService = require('../services/sheetsService');
const { getCurrentTimestamp, formatTimeForDisplay } = require('../utils/timeUtils');
const { safeReply } = require('../utils/safeReply');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clockin')
    .setDescription('Clock in and record your work start time'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.user.id;
    const username = interaction.user.username;

    try {
      // Validation: prevent double clock-in
      if (sheetsService.hasActiveClockIn(userId)) {
        logger.info('command', `clockin: ${username} already clocked in`);
        await interaction.editReply({ content: 'You are already clocked in.' });
        return;
      }

      const clockInTime = getCurrentTimestamp();
      sheetsService.recordClockIn(userId, username, clockInTime);

      const formattedTime = formatTimeForDisplay(clockInTime);
      await interaction.editReply({
        content: `Clock-in recorded at ${formattedTime}`,
      });
    } catch (err) {
      logger.error('command', 'clockin failed:', err.message);
      await safeReply(interaction, err.message || 'Failed to record clock-in.');
    }
  },
};
