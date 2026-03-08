/**
 * logger.js
 * ---------
 * Central logging with consistent prefixes and levels.
 * Use for bot lifecycle, Sheets API, and command events so logs are easy to filter.
 */

const PREFIX = {
  bot: '[bot]',
  sheets: '[sheets]',
  command: '[command]',
};

/**
 * Log an informational message.
 * @param {string} context - One of: bot, sheets, command
 * @param {string} message - Log message
 * @param {...unknown} args - Optional extra args (e.g. stack traces)
 */
function info(context, message, ...args) {
  const prefix = PREFIX[context] || '[app]';
  console.log(`${prefix} ${message}`, ...args);
}

/**
 * Log a warning (e.g. suspicious session, missing data).
 * @param {string} context - One of: bot, sheets, command
 * @param {string} message - Log message
 * @param {...unknown} args - Optional extra args
 */
function warn(context, message, ...args) {
  const prefix = PREFIX[context] || '[app]';
  console.warn(`${prefix} ${message}`, ...args);
}

/**
 * Log an error (e.g. API failure, thrown exception).
 * @param {string} context - One of: bot, sheets, command
 * @param {string} message - Log message
 * @param {...unknown} args - Optional extra args (e.g. err.stack)
 */
function error(context, message, ...args) {
  const prefix = PREFIX[context] || '[app]';
  console.error(`${prefix} ${message}`, ...args);
}

module.exports = { info, warn, error, PREFIX };
