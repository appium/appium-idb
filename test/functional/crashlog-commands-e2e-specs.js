import _ from 'lodash';
import {prepareDevice, deleteDevice, ONLINE_TIMEOUT_MS} from '../helpers/device-helpers';
import {IDB} from '../../lib/idb';

describe('idb crashlog commands', function () {
  let idb;
  let simctl;
  let chai;

  before(async function () {
    chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');

    chai.should();
    chai.use(chaiAsPromised.default);

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
