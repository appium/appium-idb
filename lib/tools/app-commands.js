import log from '../logger.js';
import { fixOutputToArray } from '../helpers';

const appCommands = {};

/**
 * Lists the targets installed applications and their metadata.
 * Example output:
 * {"bundle_id": "com.apple.test.IntegrationTests_1-Runner", "name": "IntegrationTests_1-Runner", "install_type": "user", "architectures": ["x86_64", "i386"], "process_state": "Unknown", "debuggable": false}
 * {"bundle_id": "com.apple.mobilesafari", "name": "MobileSafari", "install_type": "system", "architectures": ["x86_64"], "process_state": "Unknown", "debuggable": false}
 *
 * @returns {Array<object>}
 */
appCommands.listApps = async function listApps () {
  log.debug(`Listing the info about installed apps on the device '${this.udid}'`);
  return fixOutputToArray(await this.exec(['list-apps', '--json']));
};

/**
 * Installs the given application to the device under test.
 *
 * @param {string} appPath Full path to the .app or .ipa
 */
appCommands.installApp = async function installApp (appPath) {
  log.debug(`Installing '${appPath}' to the device '${this.udid}'`);
  await this.exec(['install', appPath]);
};

/**
 * @typedef {Object} LaunchOptions
 *
 * @property {?boolean} failIfRunning [false] - If set to true then
 * the method call will fail if the app with the given bundle id is
 * already running
 * @property {?boolean} wait [false] - Set it to true if process
 * monitoring is needed. See the description of the returned result
 * for more details
 */

/**
 * Starts an installed app on the device under test.
 *
 * @param {string} bundleId Bundle identifier of the application to launch.
 * @param {?LaunchOptions} opts
 * @returns {?SubProcess} If `opts.wait` is set to true then SubProcess instance
 * is returned, which represents the executed process monitor. The monitor
 * will be terminated when the launched is closed. stdout and stderr of the
 * remote process will also be forwarded. `null` is returned otherwise.
 */
appCommands.launchApp = async function launchApp (bundleId, opts = {}) {
  const {
    failIfRunning = false,
    wait = false,
  } = opts;
  log.debug(`Launching '${bundleId}' on the device '${this.udid}'`);
  const args = [];
  if (!failIfRunning) {
    args.push('--foreground-if-running');
  }
  if (!wait) {
    await this.exec(['launch', bundleId, ...args]);
    return null;
  }

  const processMonitor = this.createSubProcess([
    'launch', bundleId,
    ...args, '--wait-for',
  ]);
  await processMonitor.start(0);
  return processMonitor;
};

/**
 * Kills an app with the given bundle ID
 *
 * @param {string} bundleId Bundle identifier of the application to terminate
 */
appCommands.terminateApp = async function terminateApp (bundleId) {
  log.debug(`Terminating '${bundleId}' on the device '${this.udid}'`);
  await this.exec(['terminate', bundleId]);
};

/**
 * Uninstalls an app with the given bundle ID
 *
 * @param {string} bundleId Bundle identifier of the application to uninstall
 */
appCommands.uninstallApp = async function uninstallApp (bundleId) {
  log.debug(`Uninstalling '${bundleId}' from the device '${this.udid}'`);
  await this.exec(['uninstall', bundleId]);
};

export default appCommands;
