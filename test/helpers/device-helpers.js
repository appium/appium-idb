import { util } from 'appium-support';
import { retryInterval } from 'asyncbox';
import Simctl from 'node-simctl';

const MODEL = process.env.DEVICE_NAME || 'iPhone 8';
const PLATFORM_VERSION = process.env.PLATFORM_VERSION || '13.2';

async function prepareDevice (opts = {}) {
  const {
    model = MODEL,
    platformVersion = PLATFORM_VERSION,
    prebooted = true,
  } = opts;
  const simctl = new Simctl();
  simctl.udid = await simctl.createDevice(
    `appium-idb-tests-${util.uuidV4().toUpperCase()}`,
    model, platformVersion);
  if (prebooted) {
    await simctl.bootDevice();
    await simctl.startBootMonitor();
  }
  return simctl;
}

async function deleteDevice (simctl) {
  if (simctl?.udid) {
    try {
      await simctl.shutdownDevice();
    } catch (ign) {}
    await retryInterval(10, 1000, async () => await simctl.deleteDevice());
  }
}

export { prepareDevice, deleteDevice };
