/**
 * safeReply.js
 * ------------
 * Safely send a reply to a Discord interaction so command error handling
 * never throws and leaves the interaction hanging. Use in catch blocks.
 */

const logger = require('./logger');

/**
 * Send a message to the user, whether the interaction was already deferred/replied or not.
 * Catches and logs reply failures so the bot does not crash.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {string} content - Message to send
 * @param {Object} options - { ephemeral?: boolean }
 */
async function safeReply(interaction, content, options = {}) {
  const opts = { ephemeral: true, ...options };
  try {
    if (interaction.replied) {
      await interaction.followUp({ content, ...opts });
    } else if (interaction.deferred) {
      await interaction.editReply({ content });
    } else {
      await interaction.reply({ content, ...opts });
    }
  } catch (err) {
    logger.error('command', 'Failed to send reply:', err.message);
  }
}

module.exports = { safeReply };
