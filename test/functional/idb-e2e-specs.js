import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  prepareDevice, deleteDevice
} from '../helpers/device-helpers';
import IDB from '../..';


const should = chai.should();
chai.use(chaiAsPromised);

async function assertDeviceDescription (idb, udid) {
  const info = await idb.describeDevice();
  info.target_description.udid.should.eql(udid);
}

describe('idb general', function () {
  this.timeout(120000);
  let simctl;

  before(async function () {
    simctl = await prepareDevice({
      prebooted: false,
    });
  });
  after(async function () {
    await deleteDevice(simctl);
  });

  describe('connect/disconnect (booted device)', function () {
    let idb;

    before(async function () {
      idb = new IDB({
        udid: simctl.udid,
      });
      await simctl.bootDevice();
      await simctl.startBootMonitor();
      await idb.connect({onlineTimeout: 10000});
    });
    after(async function () {
      await idb.disconnect();
      try {
        await simctl.shutdownDevice();
      } catch (ign) {}
    });

    // TODO: getting the description returns data in a format that is a pain
    // to parse.
    it.skip('should be able to call connect/disconnect multiple times', async function () {
      await idb.connect();
      await assertDeviceDescription(idb, simctl.udid);
      await idb.disconnect();
    });
  });

  describe('connect/disconnect (non booted device)', function () {
    let idb;

    before(async function () {
      idb = new IDB({
        udid: simctl.udid,
      });
      try {
        await simctl.shutdownDevice();
      } catch (ign) {}
    });

    beforeEach(async function () {
      await idb.connect();
    });
    afterEach(async function () {
      await idb.disconnect();
    });

    it('should be able to call connect multiple times', async function () {
      await idb.connect().should.be.eventually.fulfilled;
    });

    it('should be able to call disconnect multiple times', async function () {
      await idb.disconnect().should.be.eventually.fulfilled;
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
