/**
 * bot.js
 * ------
 * Entry point for the Discord hours bot (discord.js v14).
 * Loads env, initializes the client, loads slash commands, and handles interactions.
 * Global error handlers keep the process running on unhandled rejections.
 */

require('dotenv').config();
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const path = require('path');
const fs = require('fs');
const sheetsService = require('./services/sheetsService');
const logger = require('./utils/logger');

// ---------------------------------------------------------------------------
// Global error handlers — keep the bot running on transient failures
// ---------------------------------------------------------------------------

process.on('unhandledRejection', (reason, promise) => {
  logger.error('bot', 'Unhandled rejection:', reason);
  if (reason && typeof reason === 'object' && reason.stack) {
    logger.error('bot', reason.stack);
  }
  // Do not exit: allow the bot to keep running
});

process.on('uncaughtException', (err) => {
  logger.error('bot', 'Uncaught exception:', err.message);
  logger.error('bot', err.stack);
  // Exit on uncaught exception so the process can be restarted cleanly
  process.exit(1);
});

// ---------------------------------------------------------------------------
// Environment and client setup
// ---------------------------------------------------------------------------

const token = process.env.DISCORD_TOKEN;
if (!token) {
  logger.error('bot', 'Missing DISCORD_TOKEN in .env. Exiting.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// ---------------------------------------------------------------------------
// Load slash commands from ./commands
// ---------------------------------------------------------------------------

const commandsPath = path.join(__dirname, 'commands');
try {
  const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if (!('data' in command) || !('execute' in command)) {
      logger.warn('bot', `Skipping ${file}: missing "data" or "execute".`);
      continue;
    }
    client.commands.set(command.data.name, command);
    logger.info('bot', `Loaded command: /${command.data.name}`);
  }
  logger.info('bot', `Total commands loaded: ${client.commands.size}`);
} catch (err) {
  logger.error('bot', 'Failed to load commands:', err.message);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Client ready — initialize Sheets (non-fatal if it fails)
// ---------------------------------------------------------------------------

client.once(Events.ClientReady, async (c) => {
  logger.info('bot', `Logged in as ${c.user.tag} (${c.user.id})`);
  try {
    await sheetsService.init();
    await sheetsService.ensureSheetAndHeader();
    logger.info('bot', 'Google Sheets ready.');
  } catch (err) {
    logger.error('bot', 'Google Sheets init failed:', err.message);
    // Bot stays up; commands that need Sheets will fail with a clear error
  }
});

// ---------------------------------------------------------------------------
// Interaction handler — execute commands with error handling
// ---------------------------------------------------------------------------

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn('bot', `Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    logger.error('bot', `Error executing /${interaction.commandName}:`, err.message);
    if (err.stack) logger.error('bot', err.stack);
    const reply = { content: 'Something went wrong running that command.', ephemeral: true };
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    } catch (replyErr) {
      logger.error('bot', 'Failed to send error reply:', replyErr.message);
    }
  }
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

client.login(token).catch((err) => {
  logger.error('bot', 'Login failed:', err.message);
  process.exit(1);
});
