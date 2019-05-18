import log from '../logger.js';
import _ from 'lodash';


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
 * Send a keycode or keycodes sequence to the device under test
 *
 * @param {number|string|Array<string>|Array<number>} codes Single key code
 * or array of codes
 */
interactionCommands.pressKeycode = async function pressKeycode (codes) {
  log.debug(`Performing button press by keycode ${JSON.stringify(codes)} ` +
    `on the device '${this.udid}'`);
  const args = ['ui', _.isArray(codes) ? 'key-sequence' : 'key'];
  if (_.isArray(codes)) {
    args.push(...codes);
  } else {
    args.push(codes);
  }
  await this.exec(args);
};

export default interactionCommands;
