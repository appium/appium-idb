import log from '../logger.js';
import { fixOutputToArray } from '../helpers';


const logCommands = {};

/**
 * Fetches a list of crash logs present on the target
 *
 * @returns {Array<object>} The list of fetched logs or an empty array
 */
logCommands.listCrashLogs = async function listCrashLogs (opts = {}) {
  const {
    bundleId,
    before,
    since,
  } = opts;
  log.debug(`Listing crash logs on the device '${this.udid}'`);
  const args = ['crash', 'list', '--json'];
  if (bundleId) {
    args.push('--bundle-id', bundleId);
  }
  if (before) {
    args.push('--before', before);
  }
  if (since) {
    args.push('--since', since);
  }
  return fixOutputToArray(await this.exec(args));
};

/**
 * Fetches the crash log with the specified name
 *
 * @param {string} name The name of the log to fetch
 * @returns {string} The content of the log
 */
logCommands.fetchCrashLog = async function fetchCrashLog (name) {
  log.debug(`Fetching the crash log '${name}' from the device '${this.udid}'`);
  return await this.exec(['crash', 'show', name]);
};

/**
 * @typedef {Object} DeleteCrashLogOptions
 *
 * @property {string} name - If present then only
 * this particular log is going to be deleted
 * @property {string} before - If set then only logs
 * before this date will be deleted
 * @property {string} since - If set then only logs
 * after this date will be deleted
 * @property {boolean} all - If set then all crash logs
 * are going to be deleted
 */

/**
 * Deletes crash logs
 *
 * @param {DeleteCrashLogOptions} opts
 */
logCommands.deleteCrashLogs = async function deleteCrashLogs (opts = {}) {
  const {
    name,
    before,
    since,
    all,
  } = opts;
  log.debug(`Deleting crash logs from the device '${this.udid}'`);
  const args = ['crash', 'delete'];
  if (name) {
    args.push(name);
  }
  if (before) {
    args.push('--before', before);
  }
  if (since) {
    args.push('--since', since);
  }
  if (all) {
    args.push('--all');
  }
  await this.exec(args);
};

export default logCommands;
