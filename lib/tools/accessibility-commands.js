import log from '../logger.js';


const accessibilityCommands = {};

/**
 * Describes the Accessibility tree on the device under test
 *
 * @this {import('../idb.js').IDB}
 * @returns {Promise<any[]>} JSON formatted list of all the elements currently on screen,
 * including their bounds and accessibility information
 */
accessibilityCommands.describeAll = async function describeAll () {
  log.debug(`Describing the UI on the device '${this.udid}'`);
  return JSON.parse(await this.exec(['ui', 'describe-all']));
};

/**
 * Describes the Accessibility tree on the device under test at
 * the particular coordinate point
 *
 * @this {import('../idb.js').IDB}
 * @returns {Promise<any[]?>} JSON formatted information about a specific point on
 * the screen, if an element exists there.
 */
accessibilityCommands.describePoint = async function describePoint (x, y) {
  log.debug(`Describing the UI at (${x}, ${y}) on the device '${this.udid}'`);
  try {
    return JSON.parse(await this.exec(['ui', 'describe-point'], [x, y]));
  } catch (ign) {
    return null;
  }
};

export default accessibilityCommands;
