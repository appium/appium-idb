import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  prepareDevice, deleteDevice, ONLINE_TIMEOUT_MS
} from '../helpers/device-helpers';
import IDB from '../../lib/idb';


chai.should();
chai.use(chaiAsPromised);

describe('idb misc commands', function () {
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

  it('describeDevice', async function () {
    const info = await idb.describeDevice();
    info.udid.should.eql(simctl.udid);
  });

  it('openUrl', async function () {
    await idb.openUrl('https://appium.io').should.be.fulfilled;
  });

  it('clearKeychain', async function () {
    await idb.clearKeychain().should.be.fulfilled;
  });

  it('setLocation', async function () {
    await idb.setLocation(50.123, 10.456).should.be.fulfilled;
  });
});
