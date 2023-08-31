import _ from 'lodash';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  prepareDevice, deleteDevice, ONLINE_TIMEOUT_MS
} from '../helpers/device-helpers';
import IDB from '../../lib/idb';


chai.should();
chai.use(chaiAsPromised);

describe('idb crashlog commands', function () {
  let idb;
  let simctl;

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

  it('listCrashLogs', async function () {
    if (process.env.CI) {
      return this.skip();
    }
    const crashes = await idb.listCrashLogs();
    _.isArray(crashes).should.be.true;
  });

  it('deleteCrashLogs', async function () {
    if (process.env.CI) {
      return this.skip();
    }
    await idb.deleteCrashLogs({all: true}).should.be.fulfilled;
  });
});
