import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  shutdown, bootDevice, startBootMonitor,
} from 'node-simctl';
import {
  createDevice, deleteDevice
} from '../helpers/device-helpers';
import IDB from '../..';


chai.should();
chai.use(chaiAsPromised);

describe('idb interaction commands', function () {
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
  });
  after(async function () {
    try {
      await shutdown(udid);
    } catch (ign) {}
    await deleteDevice(udid);
  });
  beforeEach(async function () {
    await idb.connect();
  });
  afterEach(async function () {
    await idb.disconnect();
  });

  it('tap', async function () {
    await idb.tap(100, 100).should.be.fulfilled;
  });

  it('pressButton', async function () {
    await idb.pressButton('HOME').should.be.fulfilled;
  });

  it('pressKeycode', async function () {
    await idb.pressKeycode(4, {
      duration: 2,
    }).should.be.fulfilled;
    await idb.pressKeycode([4, 5, 6]).should.be.fulfilled;
  });
});
