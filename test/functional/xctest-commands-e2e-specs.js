import chai from 'chai';
import path from 'path';
import chaiAsPromised from 'chai-as-promised';
import axios from 'axios';
import {
  prepareDevice, deleteDevice
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
  let simctl;
  let idb;

  before(async function () {
    simctl = await prepareDevice();
    idb = new IDB({
      udid: simctl.udid,
    });
    await idb.connect({onlineTimeout: 10000});
  });
  after(async function () {
    await idb.disconnect();
    await deleteDevice(simctl);
  });

  it('xcuitest', async function () {
    await simctl.installApp(WDA_BUNDLE_PATH);
    const xctestBundleId = await idb.installXCTestBundle(XCTEST_BUNDLE_PATH);
    const installedXctestBundleIds = await idb.listXCTestBundles();
    installedXctestBundleIds.should.includes(xctestBundleId);
    const process = await idb.runXCUITest(WDA_BUNDLE_ID, SAFARI_BUNDLE_ID, xctestBundleId);
    try {
      await retryInterval(10, 1000, async () => await axios({
        url: 'http://localhost:8100/status',
        timeout: 300,
      }));
    } finally {
      process.stop();
    }
  });
  it('xcuitest with env', async function () {
    const port = 8101;
    await simctl.installApp(WDA_BUNDLE_PATH);
    const xctestBundleId = await idb.installXCTestBundle(XCTEST_BUNDLE_PATH);
    const installedXctestBundleIds = await idb.listXCTestBundles();
    installedXctestBundleIds.should.includes(xctestBundleId);
    const process = await idb.runXCUITest(WDA_BUNDLE_ID, SAFARI_BUNDLE_ID, xctestBundleId, { env: { USE_PORT: port }});
    try {
      await retryInterval(10, 1000, async () => await axios({
        url: `http://localhost:${port}/status`,
        timeout: 300,
      }));
    } finally {
      process.stop();
    }
  });
});
