/**
 * weeklyhours.js
 * --------------
 * Slash command: /weeklyhours
 * Retrieves the user's hours for the current week from Google Sheets and replies with the total.
 */

const { SlashCommandBuilder } = require('discord.js');
const sheetsService = require('../services/sheetsService');
const { safeReply } = require('../utils/safeReply');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weeklyhours')
    .setDescription('Show your total hours for the current week'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });
    const userId = interaction.user.id;

    try {
      const totalHours = await sheetsService.getUserWeeklyHours(userId);
      const hourWord = totalHours === 1 ? 'hour' : 'hours';
      await interaction.editReply({
        content: `You have worked ${totalHours} ${hourWord} this week.`,
      });
    } catch (err) {
      logger.error('command', 'weeklyhours failed:', err.message);
      await safeReply(interaction, err.message || 'Failed to load weekly hours.');
    }
  },
};
