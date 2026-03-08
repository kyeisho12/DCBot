/**
 * deploy-commands.js
 * ------------------
 * Registers slash commands to a specific guild for development (discord.js v14).
 * Run: npm run deploy
 * Requires in .env: DISCORD_TOKEN, CLIENT_ID, GUILD_ID.
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error('[deploy] Missing required env: DISCORD_TOKEN, CLIENT_ID, or GUILD_ID.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

try {
  const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    }
  }
} catch (err) {
  console.error('[deploy] Failed to read commands:', err.message);
  process.exit(1);
}

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`[deploy] Registering ${commands.length} slash command(s) to guild ${guildId}...`);
    const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log(`[deploy] Successfully registered ${data.length} command(s) to the guild.`);
  } catch (err) {
    console.error('[deploy] Registration failed:', err.message);
    if (err.rawError) console.error('[deploy] Raw error:', err.rawError);
    process.exit(1);
  }
})();
