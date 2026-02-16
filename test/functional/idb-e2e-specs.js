import {prepareDevice, deleteDevice, ONLINE_TIMEOUT_MS} from '../helpers/device-helpers';
import {IDB} from '../../lib/idb';

async function assertDeviceDescription(idb, udid) {
  const info = await idb.describeDevice();
  info.udid.should.eql(udid);
}

describe('idb general', function () {
  let simctl;
  let chai;
  let should;

  before(async function () {
    chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');

    should = chai.should();
    chai.use(chaiAsPromised.default);

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
        verbose: true,
      });
      await simctl.bootDevice();
      await simctl.startBootMonitor();
      await idb.connect({onlineTimeout: ONLINE_TIMEOUT_MS});
    });
    after(async function () {
      await idb.disconnect();
      try {
        await simctl.shutdownDevice();
      } catch {}
    });

    it('should be able to call connect/disconnect multiple times', async function () {
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
        verbose: true,
      });
      await simctl.shutdownDevice({timeout: ONLINE_TIMEOUT_MS});
    });

    beforeEach(async function () {
      try {
        await idb.connect();
      } catch {}
    });
    afterEach(async function () {
      try {
        await idb.disconnect();
      } catch {}
    });

    it('should be able to call connect multiple times', async function () {
      await idb.connect().should.be.fulfilled;
    });

    it('should be able to call disconnect multiple times', async function () {
      await idb.disconnect().should.be.fulfilled;
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
