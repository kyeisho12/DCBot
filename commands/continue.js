/**
 * continue.js
 * -----------
 * Slash command: /continue
 * Resumes a paused session. Validation: must be clocked in and paused.
 */

const { SlashCommandBuilder } = require('discord.js');
const sheetsService = require('../services/sheetsService');
const { safeReply } = require('../utils/safeReply');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('continue')
    .setDescription('Resume your paused work session'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });
    const userId = interaction.user.id;
    const username = interaction.user.username;

    try {
      sheetsService.continueSession(userId);
      await interaction.editReply({
        content: 'Session resumed. You may continue working.',
      });
      logger.info('command', `continue: ${username} resumed session`);
    } catch (err) {
      logger.error('command', 'continue failed:', err.message);
      await safeReply(interaction, err.message || 'Failed to resume session.');
    }
  },
};
