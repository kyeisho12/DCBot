/**
 * retry.js
 * --------
 * Retry logic for transient failures (e.g. Google Sheets API rate limits or 5xx).
 * Uses exponential backoff. Only retries on retryable status codes or network errors.
 */

const logger = require('./logger');

const DEFAULT_OPTIONS = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  operationName: 'operation',
};

/**
 * HTTP status codes that are safe to retry (transient).
 */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * Returns true if the error is likely transient (network or server-side).
 * @param {Error} err
 * @returns {boolean}
 */
function isRetryable(err) {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const code = err.code ?? err.response?.status ?? err.status;
  if (typeof code === 'number' && RETRYABLE_STATUSES.has(code)) return true;
  if (msg.includes('econnreset') || msg.includes('etimedout') || msg.includes('socket hang up')) return true;
  if (msg.includes('rate limit') || msg.includes('quota') || msg.includes('503') || msg.includes('500')) return true;
  return false;
}

/**
 * Run an async function with retries and exponential backoff.
 * @param {() => Promise<T>} fn - Async function (no args). Retried on rejection.
 * @param {Object} options - { maxAttempts?, baseDelayMs?, operationName? }
 * @returns {Promise<T>}
 */
async function withRetry(fn, options = {}) {
  const { maxAttempts, baseDelayMs, operationName } = { ...DEFAULT_OPTIONS, ...options };
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !isRetryable(err)) {
        throw err;
      }
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn('sheets', `${operationName} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms: ${err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

module.exports = { withRetry, isRetryable };
