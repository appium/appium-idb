import _ from 'lodash';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  shutdown, bootDevice, startBootMonitor,
} from 'node-simctl';
import { retryInterval } from 'asyncbox';
import {
  createDevice, deleteDevice
} from '../helpers/device-helpers';
import IDB from '../..';


chai.should();
chai.use(chaiAsPromised);

describe('idb accessibility commands', function () {
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
    await idb.connect({onlineTimeout: 10000});
  });
  after(async function () {
    await idb.disconnect();
    try {
      await shutdown(udid);
    } catch (ign) {}
    await deleteDevice(udid);
  });

  it('describeAll', async function () {
    const ui = await retryInterval(5, 100, async function () {
      return await idb.describeAll();
    });
    _.isArray(ui).should.be.true;
    _.isEmpty(ui).should.be.false;
  });

  it('describePoint', async function () {
    await idb.describePoint(100, 100).should.be.fulfilled;
  });
});
