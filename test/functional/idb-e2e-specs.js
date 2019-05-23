import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  createDevice, deleteDevice, shutdown, bootDevice,
  startBootMonitor,
} from 'node-simctl';
import { retryInterval } from 'asyncbox';
import UUID from 'uuid-js';
import IDB from '../..';


const should = chai.should();
chai.use(chaiAsPromised);

const MODEL = 'iPhone 8';
const PLATFORM_VERSION = '12.2';

async function assertDeviceDescription (idb, udid) {
  const info = await idb.describeDevice();
  info.target_description.udid.should.eql(udid);
}

describe('idb general', function () {
  this.timeout(120000);
  let udid;

  before(async function () {
    udid = await createDevice(`appium-idb-tests-${UUID.create().hex.toUpperCase()}`,
      MODEL, PLATFORM_VERSION);
  });
  after(async function () {
    if (udid) {
      await retryInterval(10, 1000, async () => await deleteDevice(udid));
      udid = null;
    }
  });

  describe('connect/disconnect (booted device)', function () {
    let idb;

    before(async function () {
      idb = new IDB({
        udid,
      });
      await bootDevice(udid);
      await startBootMonitor(udid);
    });
    after(async function () {
      try {
        await shutdown(udid);
      } catch (ign) {}
    });

    beforeEach(async function () {
      await idb.connect();
    });
    afterEach(async function () {
      await idb.disconnect();
    });

    it('should be able to call connect multiple times', async function () {
      await idb.connect();
      await assertDeviceDescription(idb, udid);
    });

    it('should be able to call disconnect multiple times', async function () {
      await assertDeviceDescription(idb, udid);
      await idb.disconnect();
    });

    it('should connect and disconnect', async function () {
      await assertDeviceDescription(idb, udid);
    });
  });

  describe('connect/disconnect (non booted device)', function () {
    let idb;

    before(async function () {
      idb = new IDB({
        udid,
      });
      try {
        await shutdown(udid);
      } catch (ign) {}
    });

    beforeEach(async function () {
      await idb.connect();
    });
    afterEach(async function () {
      await idb.disconnect();
    });

    it('should be able to call connect multiple times', async function () {
      await idb.connect();
      await assertDeviceDescription(idb, udid);
    });

    it('should be able to call disconnect multiple times', async function () {
      await assertDeviceDescription(idb, udid);
      await idb.disconnect();
    });

    it('should connect and disconnect', async function () {
      await assertDeviceDescription(idb, udid);
    });
  });

  describe('connect an invalid device', function () {
    it('should throw if no udid is provided', function () {
      should.throw(() => new IDB());
    });

    it('should throw if invalid udid is provided', async function () {
      const idb = new IDB({udid: 'blabla'});
      await idb.connect().should.eventually.be.rejected;
    });
  });
});
