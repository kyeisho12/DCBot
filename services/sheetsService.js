/**
 * sheetsService.js
 * ----------------
 * Google Sheets integration using the Sheets API and a Service Account.
 * All API calls use retry logic for transient failures. Env: GOOGLE_SHEET_ID,
 * GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY.
 *
 * ClockLog sheet columns: DATE | USER | DISCORD_ID | CLOCK_IN | CLOCK_OUT | HOURS
 * Active clock-in sessions are stored in memory; rows are appended to ClockLog on clock-out.
 */

const { google } = require('googleapis');
const { getWeekStart, calculateHours, formatDateForDisplay, formatTimeForDisplay, dayjs } = require('../utils/timeUtils');
const logger = require('../utils/logger');
const { withRetry } = require('../utils/retry');

const CLOCKLOG_SHEET = 'BotSheet';
const CLOCKLOG_HEADER = ['DATE', 'USER', 'DISCORD_ID', 'CLOCK_IN', 'CLOCK_OUT', 'HOURS'];

let sheets = null;
let spreadsheetId = null;

/** @type {Map<string, { userId: string, username: string, clockInTime: string }>} */
const activeSessions = new Map();

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize the Google Sheets client using Service Account credentials from env.
 * Call once at bot startup before any other methods.
 */
async function init() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!sheetId || !clientEmail || !privateKey) {
    const msg = 'Missing GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, or GOOGLE_PRIVATE_KEY in .env';
    logger.error('sheets', msg);
    throw new Error(msg);
  }

  const privateKeyUnescaped = privateKey.replace(/\\n/g, '\n');
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKeyUnescaped,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();
  sheets = google.sheets({ version: 'v4', auth: authClient });
  spreadsheetId = sheetId;
  logger.info('sheets', 'Sheets client initialized');
}

/**
 * Ensure the ClockLog sheet exists and has the header row. Call after init().
 * Creates the sheet tab if missing, then writes the header row.
 */
async function ensureSheetAndHeader() {
  if (!sheets || !spreadsheetId) {
    throw new Error('Sheets client not initialized. Call init() first.');
  }

  try {
    await withRetry(
      () =>
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `'${CLOCKLOG_SHEET}'!A1:F1`,
        }),
      { operationName: 'getClockLogSheet' }
    );
  } catch (err) {
    const missing = err.code === 404 || (err.message && err.message.includes('Unable to parse range'));
    if (missing) {
      logger.info('sheets', `Creating sheet tab "${CLOCKLOG_SHEET}"`);
      await withRetry(
        () =>
          sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [{ addSheet: { properties: { title: CLOCKLOG_SHEET } } }],
            },
          }),
        { operationName: 'addClockLogSheet' }
      );
    } else {
      logger.error('sheets', 'Failed to read ClockLog sheet', err.message);
      throw new Error(`Failed to read sheet: ${err.message}`);
    }
  }

  await withRetry(
    () =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${CLOCKLOG_SHEET}'!A1:F1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [CLOCKLOG_HEADER] },
      }),
    { operationName: 'updateClockLogHeader' }
  );
  logger.info('sheets', 'ClockLog sheet header ensured');
}

// ---------------------------------------------------------------------------
// In-memory session management
// ---------------------------------------------------------------------------

/**
 * Store a clock-in session in memory. Does not write to sheets.
 */
function recordClockIn(userId, username, clockInTime) {
  activeSessions.set(userId, { userId, username, clockInTime });
  logger.info('sheets', `Clock-in recorded in memory for user ${userId}`);
}

/**
 * Returns true if the user has an active clock-in session in memory.
 */
function hasActiveClockIn(userId) {
  return activeSessions.has(userId);
}

/**
 * Process clock-out: get session from memory, append to ClockLog, clear session.
 * @param {string} userId - Discord user ID
 * @param {string} clockOutTime - ISO timestamp
 * @returns {{ hoursWorked: number }}
 */
async function processClockOut(userId, clockOutTime) {
  const session = activeSessions.get(userId);
  if (!session) {
    throw new Error('You must clock in first.');
  }

  const { username, clockInTime } = session;
  const hoursWorked = calculateHours(clockInTime, clockOutTime);

  // Format for ClockLog: DATE (M/D/YYYY) | USER | DISCORD_ID | CLOCK_IN | CLOCK_OUT | HOURS
  const dateStr = formatDateForDisplay(clockOutTime);
  const clockInFormatted = formatTimeForDisplay(clockInTime);
  const clockOutFormatted = formatTimeForDisplay(clockOutTime);
  const hoursRounded = Math.round(hoursWorked * 100) / 100;

  const row = [dateStr, username, userId, clockInFormatted, clockOutFormatted, hoursRounded];
  await appendClockLogRow(row);

  activeSessions.delete(userId);
  logger.info('sheets', `Clock-out for user ${userId}, ${hoursWorked}h written to ClockLog`);
  return { hoursWorked };
}

/**
 * Append a row to the ClockLog sheet.
 * @param {string[]} row - [DATE, USER, DISCORD_ID, CLOCK_IN, CLOCK_OUT, HOURS]
 */
async function appendClockLogRow(row) {
  if (!sheets || !spreadsheetId) {
    throw new Error('Sheets client not initialized. Call init() first.');
  }

  await withRetry(
    () =>
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${CLOCKLOG_SHEET}'!A:F`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [row] },
      }),
    { operationName: 'appendClockLogRow' }
  );
}

// ---------------------------------------------------------------------------
// Weekly data (reads from ClockLog)
// ---------------------------------------------------------------------------

/**
 * Get total hours worked by the user for the current week (Monday–Sunday).
 * Reads from ClockLog: columns DATE (A), DISCORD_ID (C), HOURS (F).
 */
async function getUserWeeklyHours(userId) {
  if (!sheets || !spreadsheetId) {
    throw new Error('Sheets client not initialized. Call init() first.');
  }

  const res = await withRetry(
    () =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${CLOCKLOG_SHEET}'!A:F`,
      }),
    { operationName: 'getUserWeeklyHours' }
  );
  const rows = res.data.values || [];
  const currentWeekStart = getWeekStart().format('YYYY-MM-DD');
  let total = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowDate = row[0];
    const rowUserId = String(row[2]);
    const hours = parseFloat(row[5], 10);
    if (String(rowUserId) !== String(userId)) continue;
    if (!rowDate || !isDateInWeek(rowDate, currentWeekStart)) continue;
    if (!Number.isNaN(hours)) total += hours;
  }

  return Math.round(total * 100) / 100;
}

/**
 * Get all users' hours for the current week, grouped by user, sorted by total hours descending.
 */
async function getWeeklyReportData() {
  if (!sheets || !spreadsheetId) {
    throw new Error('Sheets client not initialized. Call init() first.');
  }

  const res = await withRetry(
    () =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${CLOCKLOG_SHEET}'!A:F`,
      }),
    { operationName: 'getWeeklyReportData' }
  );
  const rows = res.data.values || [];
  const currentWeekStart = getWeekStart().format('YYYY-MM-DD');
  const byUser = new Map();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowDate = row[0];
    const username = row[1] || 'Unknown';
    const uid = String(row[2]);
    const hours = parseFloat(row[5], 10);
    if (!rowDate || !isDateInWeek(rowDate, currentWeekStart)) continue;
    if (Number.isNaN(hours)) continue;

    if (!byUser.has(uid)) {
      byUser.set(uid, { username, totalHours: 0 });
    }
    const entry = byUser.get(uid);
    entry.totalHours += hours;
    entry.username = username;
  }

  const result = Array.from(byUser.values())
    .map((e) => ({ ...e, totalHours: Math.round(e.totalHours * 10) / 10 }))
    .sort((a, b) => b.totalHours - a.totalHours);

  logger.info('sheets', `Weekly report: ${result.length} users`);
  return result;
}

/** Check if a date string (M/D/YYYY or YYYY-MM-DD) falls in the week containing weekStart. */
function isDateInWeek(dateStr, weekStart) {
  const d = dayjs(dateStr, ['M/D/YYYY', 'M/D/YY', 'YYYY-MM-DD'], true).utc();
  const start = dayjs(weekStart).utc();
  const end = start.add(6, 'day');
  return (d.isAfter(start) || d.isSame(start, 'day')) && (d.isBefore(end) || d.isSame(end, 'day'));
}

module.exports = {
  init,
  ensureSheetAndHeader,
  recordClockIn,
  hasActiveClockIn,
  processClockOut,
  getUserWeeklyHours,
  getWeeklyReportData,
};
