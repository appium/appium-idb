import UUID from 'uuid-js';
import * as simctl from 'node-simctl';
import { retryInterval } from 'asyncbox';

const MODEL = 'iPhone 8';
const PLATFORM_VERSION = '12.2';

async function createDevice (opts = {}) {
  const {
    model = MODEL,
    platformVersion = PLATFORM_VERSION,
  } = opts;
  return await simctl.createDevice(`appium-idb-tests-${UUID.create().hex.toUpperCase()}`,
    model, platformVersion);
}

async function deleteDevice (udid) {
  if (udid) {
    await retryInterval(10, 1000, async () => await simctl.deleteDevice(udid));
  }
}

export { createDevice, deleteDevice };
