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

describe('idb misc commands', function () {
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

  it('describeDevice', async function () {
    const info = await idb.describeDevice();
    info.target_description.udid.should.eql(udid);
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
