import _ from 'lodash';
import { retryInterval } from 'asyncbox';
import {
  prepareDevice, deleteDevice, ONLINE_TIMEOUT_MS
} from '../helpers/device-helpers';
import IDB from '../../lib/idb';

describe('idb accessibility commands', function () {
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
