import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  fixOutputToArray, convertToIDBEnv
} from '../../lib/helpers';
import _ from 'lodash';

chai.should();
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

  describe('convertToIDBEnv', function () {
    it('should convert to idb env', function () {
      const convertedEnvs = convertToIDBEnv({FAKE: 'ENV'});
      convertedEnvs.should.have.property('IDB_FAKE');
    });
    it('should return null with wrong arg', function () {
      const convertedEnvs = convertToIDBEnv(1);
      chai.should().equal(convertedEnvs, null);
    });
  });
});
