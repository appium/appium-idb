import log from '../logger.js';
import _ from 'lodash';


const miscCommands = {};

/**
 * Returns metadata about the specified target.
 * Output example:
 * {
 *   udid: 'A9391B7A-3EAF-444E-B9A5-2504A2C48E6F',
 *   name: 'appium-idb-tests-630AAB3D-27CD-43D2-BD96-7720C42B1D54',
 *   target_type: 'simulator',
 *   state: 'Booted',
 *   os_version: 'iOS 13.7',
 *   architecture: 'x86_64',
 *   companion_info: {
 *     udid: 'A9391B7A-3EAF-444E-B9A5-2504A2C48E6F',
 *     is_local: true,
 *     pid: null,
 *     address: {
 *       path: '/tmp/idb/A9391B7A-3EAF-444E-B9A5-2504A2C48E6F_companion.sock'
 *     },
 *     metadata: {}
 *   },
 *   screen_dimensions: {
 *     width: 750,
 *     height: 1334,
 *     density: 2,
 *     width_points: 375,
 *     height_points: 667
 *   },
 *   model: null,
 *   device: null,
 *   extended: {},
 *   diagnostics: {},
 *   metadata: {}
 * }
 *
 * @this {import('../idb.js').IDB}
 * @returns {Promise<Record<string, any>>} The command output parsed to an object
 */
miscCommands.describeDevice = async function describeDevice () {
  log.debug(`Describing the device '${this.udid}'`);
  const output = await this.exec(['describe'], ['--json']);
  return JSON.parse(output);
};

/**
 * Brings a simulators window to the foreground.
 * @this {import('../idb.js').IDB}
 */
miscCommands.focusSimulator = async function focusSimulator () {
  log.debug(`Focusing Simulator '${this.udid}'`);
  await this.exec(['focus']);
};

/**
 * Opens the specified URL on the target.
 * This works both with web addresses and URL schemes present on the target.
 *
 * @this {import('../idb.js').IDB}
 * @param {string} url The url to open
 */
miscCommands.openUrl = async function openUrl (url) {
  log.debug(`Opening URL '${url}' on the device '${this.udid}'`);
  await this.exec(['open'], [url]);
};

/**
 * Clear the entire keychain on Simulator.
 * @this {import('../idb.js').IDB}
 */
miscCommands.clearKeychain = async function clearKeychain () {
  log.debug(`Clearing keychain on the device '${this.udid}'`);
  await this.exec(['clear-keychain']);
};

/**
 * Overrides a simulators location
 *
 * @param {string|number} latitude The latitude value
 * @param {string|number} longitude The longitude value
 * @this {import('../idb.js').IDB}
 */
miscCommands.setLocation = async function setLocation (latitude, longitude) {
  log.debug(`Setting location (${latitude}, ${longitude}) on the device '${this.udid}'`);
  await this.exec(['set-location'], [`${latitude}`, `${longitude}`]);
};

/**
 * Programmatically approve permission for an app on Simulator
 *
 * @this {import('../idb.js').IDB}
 * @param {string} bundleId Application identifier to set the permissions for
 * @param {string|string[]} permissions The permission(s) to apply. Can be
 * one of {photos,camera,camera}
 */
miscCommands.approve = async function approve (bundleId, permissions) {
  log.debug(`Approving permissions (${JSON.stringify(permissions)}) for '${bundleId}' ` +
    `on the device '${this.udid}'`);
  const command = ['approve'];
  const args = [];
  if (_.isArray(permissions)) {
    args.push(...permissions);
  } else {
    args.push(permissions);
  }
  args.push(bundleId);
  await this.exec(command, args);
};

/**
 * Overwrite the simulators contacts db
 *
 * @this {import('../idb.js').IDB}
 * @param {string} dbPath Full path to the SQLite db containing the contacts
 */
miscCommands.addContacts = async function addContacts (dbPath) {
  log.debug(`Adding contacts from (${dbPath}) to the device '${this.udid}'`);
  await this.exec(['contacts', 'update'], [dbPath]);
};

export default miscCommands;
