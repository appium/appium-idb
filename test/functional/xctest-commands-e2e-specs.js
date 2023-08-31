import chai from 'chai';
import path from 'path';
import chaiAsPromised from 'chai-as-promised';
import axios from 'axios';
import {
  prepareDevice, deleteDevice, ONLINE_TIMEOUT_MS
} from '../helpers/device-helpers';
import IDB from '../../lib/idb';
import { retryInterval } from 'asyncbox';


chai.should();
chai.use(chaiAsPromised);

const WDA_BUNDLE_ID = 'com.facebook.WebDriverAgentRunner.xctrunner';
const WDA_BUNDLE_PATH = path.resolve(__dirname, '..', 'asset', 'WebDriverAgentRunner-Runner.app');
const XCTEST_BUNDLE_PATH = path.join(WDA_BUNDLE_PATH, 'PlugIns', 'WebDriverAgentRunner.xctest');
const SAFARI_BUNDLE_ID = 'com.apple.mobilesafari';

describe('idb xctest commands', function () {
  let simctl;
  let idb;

  before(async function () {
    simctl = await prepareDevice();
    idb = new IDB({
      udid: simctl.udid,
      verbose: true,
    });
    await idb.connect({onlineTimeout: ONLINE_TIMEOUT_MS});
  });
  after(async function () {
    await idb.disconnect();
    await deleteDevice(simctl);
  });

  it('xcuitest', async function () {
    if (process.env.CI) {
      return this.skip();
    }

    await simctl.installApp(WDA_BUNDLE_PATH);
    const xctestBundleId = await idb.installXCTestBundle(XCTEST_BUNDLE_PATH);
    xctestBundleId.should.eql('com.facebook.wda.runner');
    const installedXctestBundleIds = await idb.listXCTestBundles(xctestBundleId);
    installedXctestBundleIds.should.includes(xctestBundleId);
    const process = await idb.runXCUITest(WDA_BUNDLE_ID, SAFARI_BUNDLE_ID, xctestBundleId);
    try {
      await retryInterval(30, 1000, async () => await axios({
        url: 'http://localhost:8100/status',
        timeout: 300,
      }));
    } finally {
      process.stop();
    }
  });
  it('xcuitest with env', async function () {
    if (process.env.CI) {
      return this.skip();
    }

    const port = 8101;
    await simctl.installApp(WDA_BUNDLE_PATH);
    const xctestBundleId = await idb.installXCTestBundle(XCTEST_BUNDLE_PATH);
    const installedXctestBundleIds = await idb.listXCTestBundles();
    installedXctestBundleIds.should.includes(xctestBundleId);
    const testsInBundle = await idb.listXCTestsInTestBundle(xctestBundleId);
    testsInBundle.should.eql(['UITestingUITests/testRunner']);
    const process = await idb.runXCUITest(WDA_BUNDLE_ID, SAFARI_BUNDLE_ID, xctestBundleId,
        { env: { USE_PORT: port }, testType: 'ui'});
    try {
      await retryInterval(30, 1000, async () => await axios({
        url: `http://localhost:${port}/status`,
        timeout: 300,
      }));
    } finally {
      process.stop();
    }
  });
});
