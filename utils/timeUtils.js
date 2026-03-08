/**
 * timeUtils.js
 * ------------
 * Reusable time calculations using dayjs.
 * Used for timestamps, hour calculations, and week boundaries (Monday start).
 * Uses BOT_TIMEZONE from .env (e.g. Asia/Manila) for display; falls back to system local time.
 */

const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);

// ---------------------------------------------------------------------------
// Core API (requested)
// ---------------------------------------------------------------------------

/**
 * Returns the current time as an ISO 8601 timestamp (UTC).
 * Suitable for storage and passing to calculateHours / getWeekStart.
 * @returns {string} ISO timestamp, e.g. "2025-03-07T12:00:00.000Z"
 */
function getCurrentTimestamp() {
  return dayjs().utc().toISOString();
}

/**
 * Returns total hours between two timestamps (clock-in and clock-out).
 * Accepts ISO strings, Date objects, or dayjs instances. Uses UTC for consistency.
 * @param {string|Date|dayjs.Dayjs} clockIn - Start time
 * @param {string|Date|dayjs.Dayjs} clockOut - End time
 * @returns {number} Total hours (decimal), e.g. 2.5
 */
function calculateHours(clockIn, clockOut) {
  const start = dayjs(clockIn).utc();
  const end = dayjs(clockOut).utc();
  const minutes = end.diff(start, 'minute', true);
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Returns the start date of the current week (Monday at 00:00:00) in UTC.
 * Week is Monday–Sunday; useful for filtering "this week" and for WeekStart in sheets.
 * @returns {dayjs.Dayjs} Start of current week (Monday)
 */
function getWeekStart() {
  const d = dayjs().utc();
  return (d.day() === 0 ? d.day(-6) : d.day(1)).startOf('day');
}

// ---------------------------------------------------------------------------
// Display formatting (uses BOT_TIMEZONE or system local)
// ---------------------------------------------------------------------------

/** Get a dayjs in the bot's display timezone from an ISO UTC timestamp. */
function inBotTimezone(isoString) {
  const tz = process.env.BOT_TIMEZONE;
  const d = dayjs(isoString).utc();
  return tz ? d.tz(tz) : d.local();
}

/** Format time as HH:mm in the bot's timezone (e.g. "13:06"). */
function formatTimeForDisplay(isoString) {
  return inBotTimezone(isoString).format('HH:mm');
}

/** Format date as M/D/YYYY in the bot's timezone (e.g. "3/8/2026"). */
function formatDateForDisplay(isoString) {
  return inBotTimezone(isoString).format('M/D/YYYY');
}

// ---------------------------------------------------------------------------
// Helpers (used by commands and sheetsService)
// ---------------------------------------------------------------------------

/**
 * Format a duration in milliseconds as "Xh Ym" for display.
 * @param {number} ms - Duration in milliseconds
 * @returns {string}
 */
function formatDuration(ms) {
  const d = dayjs.duration(ms);
  const hours = Math.floor(d.asHours());
  const minutes = d.minutes();
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

/**
 * Parse an ISO timestamp string and return a dayjs object (UTC).
 * @param {string} isoString
 * @returns {dayjs.Dayjs}
 */
function parseTimestamp(isoString) {
  return dayjs(isoString).utc();
}

/**
 * End of the current week (Sunday 23:59:59.999) in UTC.
 * @returns {dayjs.Dayjs}
 */
function getWeekEnd() {
  const d = dayjs().utc();
  return (d.day() === 0 ? d : d.day(7)).endOf('day');
}

/**
 * Whether a given timestamp falls within the current week (Mon–Sun).
 * @param {string} isoString
 * @returns {boolean}
 */
function isInCurrentWeek(isoString) {
  const t = parseTimestamp(isoString);
  const start = getWeekStart();
  const end = getWeekEnd();
  return (t.isAfter(start) || t.isSame(start)) && (t.isBefore(end) || t.isSame(end));
}

module.exports = {
  getCurrentTimestamp,
  calculateHours,
  getWeekStart,
  formatDuration,
  parseTimestamp,
  getWeekEnd,
  isInCurrentWeek,
  formatTimeForDisplay,
  formatDateForDisplay,
  inBotTimezone,
  dayjs,
};
