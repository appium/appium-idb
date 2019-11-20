import _ from 'lodash';
import { exec } from 'teen_process';

const DEFAULT_IDB_EXEC_TIMEOUT = 20000; // in milliseconds
const DEFAULT_IDB_PORT = 9889;
const IDB_EXECUTABLE = 'idb';
const IDB_COMPANION_EXECUTABLE = 'idb_companion';
const DEFAULT_COMPANION_PORT = 10880;
const DEFAULT_COMPANION_GRPC_PORT = 10882;
const IDB_ENV_PREFIX = 'IDB_';

/**
 * @typedef {Object} PidLookupOptions
 *
 * @property {?boolean} multi [true] - Set it to true if multiple matching
 * pids are expected to be found. Only the newest process id is going to
 * be returned instead
 * @property {?boolean} ignoreCase [true] - Set it to false to make the search
 * case-sensitive
 */

/**
 * Get the process id of the most recent running application
 * having the particular command line pattern.
 *
 * @param {string} pattern - pgrep-compatible search pattern.
 * @param {?PidLookupOptions} opts
 * @return {Array<string>} An array of process ids as strings
 * or an empty array
 */
async function getPids (pattern, opts = {}) {
  const {
    multi = true,
    ignoreCase = true,
  } = opts;
  const args = [`-${ignoreCase ? 'i' : ''}f${multi ? '' : 'n'}`, pattern];
  try {
    const {stdout} = await exec('pgrep', args);
    const result = stdout.split('\n')
      .filter(Number)
      .map((x) => `${x}`);
    return multi ? result : (_.isEmpty(result) ? [] : _.first(result));
  } catch (err) {
    return [];
  }
}
/**
 * Converts an env object to the format what IDB process expects
 * @param {Object} env The object of environment variables
 * @return {Object}
 */
function convertToIDBEnv (env) {
  if (!_.isPlainObject(env) || _.isEmpty(env)) {
    return null;
  }
  return _.reduce(env, (result, value, key) => {
    result[IDB_ENV_PREFIX + key] = value;
    return result;
  }, {});
}

/**
 * Some idb commands don't properly format their
 * output if `--json` argument is provided. This helper
 * fixes the original output, so it can be represented as
 * a valid array.
 *
 * @param {string} output The original command output
 * @returns {Array<object>} Array of objects or an empty array
 */
function fixOutputToArray (output) {
  if (!_.trim(output)) {
    return [];
  }

  return output.split('\n')
    .reduce((acc, x) => {
      try {
        return [...acc, JSON.parse(x)];
      } catch (e) {
        return acc;
      }
    }, []);
}

/**
 * Some idb commands do not properly format their
 * output if `--json` argument is provided. This helper
 * fixes the original output, so it can be represented as
 * a valid object.
 *
 * @param {string} output The original command output
 * @returns {object} The parsed object or an empty object
 */
function fixOutputToObject (output) {
  if (!_.trim(output)) {
    return {};
  }

  const result = {};
  const lines = output.split('\n');
  const getLeftIndent = (line) => line.length - _.trimStart(line).length;
  let lineIdx = 0;
  do {
    if (!_.trim(lines[lineIdx])) {
      lineIdx++;
      continue;
    }

    const objectMatch = /(\S+)\s+{/.exec(lines[lineIdx]);
    if (objectMatch) {
      const currentIndent = getLeftIndent(lines[lineIdx]);
      const startLine = lineIdx;
      do {
        lineIdx++;
      } while (lineIdx < lines.length && currentIndent < getLeftIndent(lines[lineIdx]));
      const objectName = objectMatch[1];
      const objectContent = lines.slice(startLine + 1, lineIdx).join('\n');
      result[objectName] = fixOutputToObject(objectContent);
    }

    const propertyMatch = /(\S+):\s+([^\n]+)/.exec(lines[lineIdx]);
    if (propertyMatch) {
      const propertyName = propertyMatch[1];
      const propertyValue = propertyMatch[2].trim();
      result[propertyName] = propertyValue.startsWith('"')
        ? _.trim(propertyValue, '"')
        : Number(propertyValue);
    }

    lineIdx++;
  } while (lineIdx < lines.length);
  return result;
}

export {
  DEFAULT_IDB_EXEC_TIMEOUT, getPids, IDB_EXECUTABLE,
  IDB_COMPANION_EXECUTABLE, DEFAULT_IDB_PORT,
  DEFAULT_COMPANION_PORT, DEFAULT_COMPANION_GRPC_PORT,
  fixOutputToArray, fixOutputToObject, convertToIDBEnv
};
