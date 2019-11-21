import _ from 'lodash';
import methods from './tools/index.js';
import {
  DEFAULT_IDB_EXEC_TIMEOUT,
  IDB_EXECUTABLE, IDB_COMPANION_EXECUTABLE,
} from './helpers';

const DEFAULT_OPTS = {
  udid: null,
  executable: {
    path: IDB_EXECUTABLE,
    port: null,
    grpcPort: null,
    defaultArgs: [],
  },
  logLevel: null,
  companion: {
    path: IDB_COMPANION_EXECUTABLE,
    port: null,
    grpcPort: null,
    logPath: null,
  },
  execTimeout: DEFAULT_IDB_EXEC_TIMEOUT,
  verbose: false,
};

class IDB {
  constructor (opts = {}) {
    Object.assign(this, opts);
    _.defaultsDeep(this, _.cloneDeep(DEFAULT_OPTS));

    if (!this.udid) {
      throw new Error(`UDID must be set for idb`);
    }
    this.executable.defaultArgs.push('--udid', this.udid);

    if (this.logLevel) {
      this.executable.defaultArgs.push('--log', this.logLevel);
    }
  }
}

// add all the methods to the IDB prototype
for (const [fnName, fn] of _.toPairs(methods)) {
  IDB.prototype[fnName] = fn;
}

export default IDB;
export { IDB };
