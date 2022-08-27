import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  prepareDevice, deleteDevice, ONLINE_TIMEOUT_MS
} from '../helpers/device-helpers';
import IDB from '../../lib/idb';


chai.should();
chai.use(chaiAsPromised);

describe('idb interaction commands', function () {
  let simctl;
  let idb;

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
