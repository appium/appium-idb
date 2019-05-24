import _ from 'lodash';
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

describe('idb crashlog commands', function () {
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

  it('listCrashLogs', async function () {
    const crashes = await idb.listCrashLogs();
    _.isArray(crashes).should.be.true;
  });

  it('deleteCrashLogs', async function () {
    await idb.deleteCrashLogs({all: true}).should.be.fulfilled;
  });
});