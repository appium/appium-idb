import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { fixOutputToArray } from '../../lib/helpers';
import _ from 'lodash';

// eslint-disable-next-line no-unused-vars
const should = chai.should();
chai.use(chaiAsPromised);

describe('helpers', function () {
  describe('fixOutputToArray', function () {
    it('should properly fix the valid output', function () {
      const result = fixOutputToArray(`
      {"bundle_id": "com.apple.test.IntegrationTests_1-Runner", "name": "IntegrationTests_1-Runner", "install_type": "user", "architectures": ["x86_64", "i386"], "process_state": "Unknown", "debuggable": false}
      {"bundle_id": "com.apple.mobilesafari", "name": "MobileSafari", "install_type": "system", "architectures": ["x86_64"], "process_state": "Unknown", "debuggable": false}
      `);
      _.isArray(result).should.be.true;
      result.length.should.eql(2);
      result[0].should.eql({
        bundle_id: 'com.apple.test.IntegrationTests_1-Runner',
        name: 'IntegrationTests_1-Runner',
        install_type: 'user',
        architectures: ['x86_64', 'i386'],
        process_state: 'Unknown',
        debuggable: false,
      });
      result[1].should.eql({
        bundle_id: 'com.apple.mobilesafari',
        name: 'MobileSafari',
        install_type: 'system',
        architectures: ['x86_64'],
        process_state: 'Unknown',
        debuggable: false,
      });
    });

    it('should properly handle an empty output', function () {
      const result = fixOutputToArray('');
      _.isArray(result).should.be.true;
      result.length.should.eql(0);
    });
  });
});
