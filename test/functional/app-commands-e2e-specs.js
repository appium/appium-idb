import _ from 'lodash';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  shutdown, bootDevice, startBootMonitor,
} from 'node-simctl';
import {
  createDevice, deleteDevice
} from '../helpers/device-helpers';
import IDB from '../..';
import { waitForCondition } from 'asyncbox';


const MAPS_BUNDLE_ID = 'com.apple.Maps';

chai.should();
chai.use(chaiAsPromised);

describe('idb app commands', function () {
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
    await idb.connect();
  });
  after(async function () {
    await idb.disconnect();
    try {
      await shutdown(udid);
    } catch (ign) {}
    await deleteDevice(udid);
  });

  it('listApps', async function () {
    const appsList = await idb.listApps();
    appsList.some((x) => _.isEqual(x, {
      bundle_id: MAPS_BUNDLE_ID,
      name: 'Maps',
      install_type: 'system',
      architectures: ['x86_64'],
      process_state: 'Unknown',
      debuggable: false,
    })).should.be.true;
  });

  it('launchApp/terminateApp', async function () {
    await idb.launchApp(MAPS_BUNDLE_ID).should.be.fulfilled;
    await idb.launchApp(MAPS_BUNDLE_ID, {
      failIfRunning: true,
    }).should.be.rejected;
    await idb.terminateApp(MAPS_BUNDLE_ID);
  });

  it('wait for app', async function () {
    try {
      await idb.terminateApp(MAPS_BUNDLE_ID);
    } catch (ign) {}
    const appProc = await idb.launchApp(MAPS_BUNDLE_ID, {
      wait: true,
    });
    appProc.isRunning.should.be.true;
    await idb.terminateApp(MAPS_BUNDLE_ID);
    await waitForCondition(() => !appProc.isRunning, {
      waitMs: 5000,
      intervalMs: 500,
    });
  });
});
