import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  prepareDevice, deleteDevice
} from '../helpers/device-helpers';
import IDB from '../..';


chai.should();
chai.use(chaiAsPromised);

describe('idb interaction commands', function () {
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
