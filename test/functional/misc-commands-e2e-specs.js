import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  prepareDevice, deleteDevice
} from '../helpers/device-helpers';
import IDB from '../..';


chai.should();
chai.use(chaiAsPromised);

describe('idb misc commands', function () {
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

  // TODO: getting the description returns data in a format that is a pain
  // to parse.
  it.skip('describeDevice', async function () {
    const info = await idb.describeDevice();
    info.target_description.udid.should.eql(simctl.udid);
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
