import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { getSimulator } from 'appium-ios-simulator';
import { createDevice, deleteDevice } from 'node-simctl';
import { retryInterval } from 'asyncbox';
import UUID from 'uuid-js';
import IDB from '../..';


chai.should();
chai.use(chaiAsPromised);

async function deleteDeviceWithRetry (udid) {
  try {
    await retryInterval(10, 1000, deleteDevice, udid);
  } catch (ign) {}
}

describe('idb', function () {
  this.timeout(120000);

  let sim;

  before(async function () {
    const udid = await createDevice(`appium-idb-tests-${UUID.create().hex.toUpperCase()}`, 'iPhone 8', '12.2');
    sim = await getSimulator(udid);
    await sim.run();
  });
  after(async function () {
    await sim.shutdown();
    await deleteDeviceWithRetry(sim.udid);
  });

  describe('describeDevice', function () {
    let idb;
    before(async function () {
      idb = new IDB({
        udid: sim.udid,
      });
      await idb.connect();
    });
    it('should get information about the device', async function () {
      const info = await idb.describeDevice();
      info.udid.should.eql(sim.udid);
    });
  });
});
