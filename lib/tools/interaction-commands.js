import log from '../logger.js';
import _ from 'lodash';
import { util } from '@appium/support';


const interactionCommands = {};

/**
 * Taps at given coordinates
 *
 * @this {import('../idb.js').IDB}
 * @param {number|string} x Tap X coordinate
 * @param {number|string} y Tap Y coordinate
 */
interactionCommands.tap = async function tap (x, y) {
  log.debug(`Performing tap at (${x}, ${y}) on the device '${this.udid}'`);
  await this.exec(['ui', 'tap'], [`${x}`, `${y}`]);
};

/**
 * Presses a hardware button on device under test
 *
 * @this {import('../idb.js').IDB}
 * @param {string} name One of {APPLE_PAY,HOME,LOCK,SIDE_BUTTON,SIRI}
 */
interactionCommands.pressButton = async function pressButton (name) {
  log.debug(`Performing button press of '${name}' on the device '${this.udid}'`);
  await this.exec(['ui', 'button'], [name]);
};

/**
 * Types the given text on the device under test
 *
 * @this {import('../idb.js').IDB}
 * @param {string} text The text to type
 */
interactionCommands.typeText = async function typeText (text) {
  log.debug(`Typing '${text}' on the device '${this.udid}'`);
  await this.exec(['ui', 'text'], [text]);
};

/**
 * @typedef {Object} KeycodeOpts
 *
 * @property {number|string} [duration] - The key press duration in float seconds.
 * The option is ignored if multiple key codes are set.
 */

/**
 * Send a keycode or key codes sequence to the device under test
 *
 * @this {import('../idb.js').IDB}
 * @param {number|string|string[]|number[]} codeOrCodes Single key code
 * or array of codes
 * @param {KeycodeOpts} opts
 */
interactionCommands.pressKeycode = async function pressKeycode (codeOrCodes, opts = {}) {
  const {
    duration,
  } = opts;
  log.debug(`Performing key code(s) ${JSON.stringify(codeOrCodes)} press ` +
    `on the device '${this.udid}'`);
  const command = ['ui', _.isArray(codeOrCodes) ? 'key-sequence' : 'key'];
  const args = [];
  if (_.isArray(codeOrCodes)) {
    args.push(...codeOrCodes);
  } else {
    if (util.hasValue(duration)) {
      args.push('--duration', duration);
    }
    args.push(codeOrCodes);
  }
  await this.exec(command, args.map(String));
};

export default interactionCommands;
