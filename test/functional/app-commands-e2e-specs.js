import _ from 'lodash';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  prepareDevice, deleteDevice, ONLINE_TIMEOUT_MS
} from '../helpers/device-helpers';
import IDB from '../../lib/idb';
import { waitForCondition } from 'asyncbox';


const MAPS_BUNDLE_ID = 'com.apple.Maps';

chai.should();
chai.use(chaiAsPromised);

describe('idb app commands', function () {
  let idb;
  let simctl;

  before(async function () {
    simctl = await prepareDevice();
    idb = new IDB({
      udid: simctl.udid,
    });
    await idb.connect({onlineTimeout: ONLINE_TIMEOUT_MS});
  });
  after(async function () {
    await idb.disconnect();
    await deleteDevice(simctl);
  });

  it('listApps', async function () {
    const appsList = await idb.listApps();
    const mapsInfo = appsList.find(({bundle_id}) => bundle_id === MAPS_BUNDLE_ID);
    _.isPlainObject(mapsInfo).should.be.true;
    mapsInfo.name.should.eql('Maps');
    mapsInfo.install_type.should.eql('system');
  });

  async function isMapsAppRunning () {
    const {stdout} = await simctl.spawnProcess([
      'launchctl',
      'print',
      'system',
    ]);
    return stdout.includes(`UIKitApplication:${MAPS_BUNDLE_ID}`);
  }

  it('launchApp/terminateApp', async function () {
    await idb.launchApp(MAPS_BUNDLE_ID).should.be.fulfilled;
    await waitForCondition(async () => await isMapsAppRunning(), {
      waitMs: 5000,
      intervalMs: 500,
    });
    await idb.terminateApp(MAPS_BUNDLE_ID).should.be.fulfilled;
    await waitForCondition(async () => !await isMapsAppRunning(), {
      waitMs: 5000,
      intervalMs: 500,
    });
  });

  it('wait for app', async function () {
    const terminateMapsApp = async () => {
      try {
        await idb.terminateApp(MAPS_BUNDLE_ID);
      } catch (ign) {}
    };
    await terminateMapsApp();
    const appProc = await idb.launchApp(MAPS_BUNDLE_ID, {
      wait: true,
    });
    try {
      appProc.isRunning.should.be.true;
      await waitForCondition(async () => await isMapsAppRunning(), {
        waitMs: 5000,
        intervalMs: 500,
      });

      await appProc.stop('SIGINT');
      await waitForCondition(async () => !await isMapsAppRunning(), {
        waitMs: 5000,
        intervalMs: 500,
      });
      appProc.isRunning.should.be.false;
    } finally {
      await terminateMapsApp();
    }
  });
});
