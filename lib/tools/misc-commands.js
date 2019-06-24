import log from '../logger.js';
import _ from 'lodash';
import { fixOutputToObject } from '../helpers';


const miscCommands = {};

/**
 * Returns metadata about the specified target.
 * Output example:
 * target_description {
 * udid: "14EBDEDE-0C9E-46B4-B1FF-0881F11D0E75"
 * name: "iPhone X\312\200"
 * screen_dimensions {
 *   width: 828
 *   height: 1792
 *   density: 2.0
 *   width_points: 414
 *   height_points: 896
 * }
 * state: "booted"
 * target_type: "simulator"
 * os_version: "iOS 12.2"
 * architecture: "x86_64"
 *
 * @returns {object} The command output parsed to an object
 */
miscCommands.describeDevice = async function describeDevice () {
  log.debug(`Describing the device '${this.udid}'`);
  const output = await this.exec(['describe', '--json']);
  return fixOutputToObject(output);
};

/**
 * Brings a simulators window to the foreground.
 */
miscCommands.focusSimulator = async function focusSimulator () {
  log.debug(`Focusing Simulator '${this.udid}'`);
  await this.exec(['focus']);
};

/**
 * Opens the specified URL on the target.
 * This works both with web addresses and URL schemes present on the target.
 *
 * @param {string} url The url to open
 */
miscCommands.openUrl = async function openUrl (url) {
  log.debug(`Opening URL '${url}' on the device '${this.udid}'`);
  await this.exec(['open', url]);
};

/**
 * Clear the entire keychain on Simulator.
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
 */
miscCommands.setLocation = async function setLocation (latitude, longitude) {
  log.debug(`Setting location (${latitude}, ${longitude}) on the device '${this.udid}'`);
  await this.exec(['set-location', latitude, longitude]);
};

/**
 * Programmatically approve permission for an app on Simulator
 *
 * @param {string} bundleId Application identifier to set the permissions for
 * @param {string|Array<string>} permissions The permission(s) to apply. Can be
 * one of {photos,camera,camera}
 */
miscCommands.approve = async function approve (bundleId, permissions) {
  log.debug(`Approving permissions (${JSON.stringify(permissions)}) for '${bundleId}' ` +
    `on the device '${this.udid}'`);
  const args = [
    'approve', bundleId,
  ];
  if (_.isArray(permissions)) {
    args.push(...permissions);
  } else {
    args.push(permissions);
  }
  await this.exec(args);
};

/**
 * Overwrite the simulators contacts db
 *
 * @param {string} dbPath Full path to the SQLite db containing the contacts
 */
miscCommands.addContacts = async function addContacts (dbPath) {
  log.debug(`Adding contacts from (${dbPath}) to the device '${this.udid}'`);
  await this.exec(['contacts', 'update', dbPath]);
};

export default miscCommands;
