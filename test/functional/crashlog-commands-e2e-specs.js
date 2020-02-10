import _ from 'lodash';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  prepareDevice, deleteDevice
} from '../helpers/device-helpers';
import IDB from '../..';


chai.should();
chai.use(chaiAsPromised);

describe('idb crashlog commands', function () {
  this.timeout(120000);
  let idb;
  let simctl;

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

  it('listCrashLogs', async function () {
    const crashes = await idb.listCrashLogs();
    _.isArray(crashes).should.be.true;
  });

  it('deleteCrashLogs', async function () {
    await idb.deleteCrashLogs({all: true}).should.be.fulfilled;
  });
});
