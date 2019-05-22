import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  createDevice, deleteDevice, shutdown, bootDevice,
  startBootMonitor,
} from 'node-simctl';
import { retryInterval } from 'asyncbox';
import UUID from 'uuid-js';
import IDB from '../..';


chai.should();
chai.use(chaiAsPromised);

const MODEL = 'iPhone 8';
const PLATFORM_VERSION = '12.2';

describe('idb', function () {
  this.timeout(120000);
  let udid;

  before(async function () {
    udid = await createDevice(`appium-idb-tests-${UUID.create().hex.toUpperCase()}`,
      MODEL, PLATFORM_VERSION);
    await bootDevice(udid);
    await startBootMonitor(udid);
  });
  after(async function () {
    if (!udid) {
      return;
    }

    try {
      await shutdown(udid);
    } catch (ign) {}
    await retryInterval(10, 1000, async () => await deleteDevice(udid));
  });

  describe('describeDevice', function () {
    let idb;
    before(async function () {
      idb = new IDB({
        udid,
      });
      await idb.connect();
    });
    after(async function () {
      if (!idb) {
        return;
      }

      await idb.disconnect();
    });

    it('should get information about the device', async function () {
      const info = await idb.describeDevice();
      info.target_description.udid.should.eql(udid);
    });
  });
});
