import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  fixOutputToArray, fixOutputToObject
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

  describe('fixOutputToObject', function () {
    it('should properly fix the valid output', function () {
      const result = fixOutputToObject(`
      target_description {
        udid: "14EBDEDE-0C9E-46B4-B1FF-0881F11D0E75"
        name: "iPhone X\\312\\200"
        screen_dimensions {
          width: 828
          height: 1792
          density: 2.0
          width_points: 414
          height_points: 896
        }
        state: "shutdown"
        target_type: "simulator"
        os_version: "iOS 12.2"
        architecture: "x86_64"
      }
      `);
      result.should.eql({
        target_description: {
          udid: '14EBDEDE-0C9E-46B4-B1FF-0881F11D0E75',
          name: 'iPhone X\\312\\200',
          screen_dimensions: {
            width: 828,
            height: 1792,
            density: 2.0,
            width_points: 414,
            height_points: 896,
          },
          state: 'shutdown',
          target_type: 'simulator',
          os_version: 'iOS 12.2',
          architecture: 'x86_64',
        }
      });
    });

    it('should properly handle an empty output', function () {
      const result = fixOutputToObject('');
      _.isPlainObject(result).should.be.true;
      _.isEmpty(result).should.be.true;
    });
  });
});
