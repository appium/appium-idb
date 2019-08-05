import chai from 'chai';
import path from 'path';
import chaiAsPromised from 'chai-as-promised';
import request from 'request-promise';
import {
  shutdown, bootDevice, startBootMonitor,
} from 'node-simctl';
import {
  createDevice, deleteDevice
} from '../helpers/device-helpers';
import IDB from '../..';
import { retryInterval } from 'asyncbox';


chai.should();
chai.use(chaiAsPromised);

const WDA_BUNDLE_ID = 'com.apple.test.WebDriverAgentRunner-Runner';
const WDA_BUNDLE_PATH = path.join(__dirname, '..', '..', '..', 'test', 'asset', 'WebDriverAgentRunner-Runner.app');
const XCTEST_BUNDLE_PATH = path.join(WDA_BUNDLE_PATH, 'PlugIns', 'WebDriverAgentRunner.xctest');
const SAFARI_BUNDLE_ID = 'com.apple.mobilesafari';

describe('idb xctest commands', function () {
  this.timeout(120000);
  let udid;
  let idb;

  before(async function () {
    udid = await createDevice();
    idb = new IDB({
      udid,
    });
    await bootDevice(udid);
    await startBootMonitor(udid);
    await idb.connect({onlineTimeout: 10000});
  });
  after(async function () {
    await idb.disconnect();
    try {
      await shutdown(udid);
    } catch (ign) {}
    await deleteDevice(udid);
  });

  it('xcuitest', async function () {
    await idb.installApp(WDA_BUNDLE_PATH);
    const xctestBundleId = await idb.installXCTestBundle(XCTEST_BUNDLE_PATH);
    const installedXctestBundleIds = await idb.listXCTestBundles();
    installedXctestBundleIds.should.includes(xctestBundleId);
    const process = await idb.runXCUITest(WDA_BUNDLE_ID, SAFARI_BUNDLE_ID, xctestBundleId);
    try {
      await retryInterval(10, 1000, async () => await request({
        url: 'http://localhost:8100/status',
        method: 'GET',
      }));
    } finally {
      process.stop();
    }
  });
});
