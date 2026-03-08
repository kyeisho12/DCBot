/**
 * clockout.js
 * -----------
 * Slash command: /clockout
 * Retrieves stored clock-in from memory, appends to ClockLog sheet,
 * and replies with session duration. Validation: prevent clock-out without clock-in.
 */

const { SlashCommandBuilder } = require('discord.js');
const sheetsService = require('../services/sheetsService');
const { getCurrentTimestamp } = require('../utils/timeUtils');
const { safeReply } = require('../utils/safeReply');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clockout')
    .setDescription('Clock out and record your work end time'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const clockOutTime = getCurrentTimestamp();

    try {
      // Validation: prevent clock-out without clock-in (processClockOut throws if no session)
      const { hoursWorked } = await sheetsService.processClockOut(userId, clockOutTime);

      const hourWord = hoursWorked === 1 ? 'hour' : 'hours';
      await interaction.editReply({
        content: `You clocked out. Session duration: ${hoursWorked} ${hourWord}.`,
      });
    } catch (err) {
      const notClockedIn = err.message && err.message.includes('clock in first');
      logger.info('command', `clockout: ${username} — ${notClockedIn ? 'not clocked in' : err.message}`);
      await safeReply(
        interaction,
        notClockedIn ? 'You must clock in first.' : (err.message || 'Failed to record clock-out.')
      );
    }
  },
};
