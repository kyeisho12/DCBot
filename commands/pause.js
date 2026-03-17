/**
 * pause.js
 * -----------
 * Slash command: /pause
 * Pauses the current session. Validation: must be clocked in and not already paused.
 */

const { SlashCommandBuilder } = require('discord.js');
const sheetsService = require('../services/sheetsService');
const { safeReply } = require('../utils/safeReply');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause your current work session'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });
    const userId = interaction.user.id;
    const username = interaction.user.username;

    try {
      sheetsService.pauseSession(userId);
      await interaction.editReply({
        content: 'Session paused. Use /continue to resume.',
      });
      logger.info('command', `pause: ${username} paused session`);
    } catch (err) {
      logger.error('command', 'pause failed:', err.message);
      await safeReply(interaction, err.message || 'Failed to pause session.');
    }
  },
};
