import log from '../logger.js';
import _ from 'lodash';
import { util } from 'appium-support';


const interactionCommands = {};

/**
 * Taps at given coordinates
 *
 * @param {number|string} x Tap X coordinate
 * @param {number|string} y Tap Y coordinate
 */
interactionCommands.tap = async function tap (x, y) {
  log.debug(`Performing tap at (${x}, ${y}) on the device '${this.udid}'`);
  await this.exec(['ui', 'tap', x, y]);
};

/**
 * Presses a hardware button on device under test
 *
 * @param {string} name One of {APPLE_PAY,HOME,LOCK,SIDE_BUTTON,SIRI}
 */
interactionCommands.pressButton = async function pressButton (name) {
  log.debug(`Performing button press of '${name}' on the device '${this.udid}'`);
  await this.exec(['ui', 'button', name]);
};

/**
 * Types the given text on the device under test
 *
 * @param {string} text The text to type
 */
interactionCommands.typeText = async function typeText (text) {
  log.debug(`Typing '${text}' on the device '${this.udid}'`);
  await this.exec(['ui', 'text', text]);
};

/**
 * @typedef {Object} KeycodeOpts
 *
 * @property {number|string} duration - The key press duration in float seconds.
 * The option is ignored if multiple key codes are set.
 */

/**
 * Send a keycode or key codes sequence to the device under test
 *
 * @param {number|string|Array<string>|Array<number>} codes Single key code
 * or array of codes
 * @param {KeycodeOpts} opts
 */
interactionCommands.pressKeycode = async function pressKeycode (codes, opts = {}) {
  const {
    duration,
  } = opts;
  log.debug(`Performing key code(s) ${JSON.stringify(codes)} press ` +
    `on the device '${this.udid}'`);
  const args = ['ui', _.isArray(codes) ? 'key-sequence' : 'key'];
  if (_.isArray(codes)) {
    args.push(...codes);
  } else {
    args.push(codes);
    if (util.hasValue(duration)) {
      args.push('--duration', duration);
    }
  }
  await this.exec(args);
};

export default interactionCommands;
