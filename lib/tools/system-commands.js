import B from 'bluebird';
import { fs, util, timing } from '@appium/support';
import { exec as tpExec, SubProcess } from 'teen_process';
import _ from 'lodash';
import { retryInterval, waitForCondition } from 'asyncbox';
import {
  getPids, DEFAULT_IDB_EXEC_TIMEOUT, IDB_EXECUTABLE,
  IDB_COMPANION_EXECUTABLE, DEFAULT_COMPANION_GRPC_PORT,
} from '../helpers';
import log from '../logger.js';


const COMPANION_PGREP_PATTERN = (udid) =>
  `${IDB_COMPANION_EXECUTABLE}.*--udid[[:space:]]+${udid}`;
const COMPANION_STARTUP_REGEXP = /"grpc_port":(\d+)/;
const COMPANION_STARTUP_ERROR_REGEXP = /New Error Built ==> (.+)/;
const COMPANION_STARTUP_TIMEOUT_SEC = 30;

const systemCallMethods = {};

/**
 * @typedef {Object} ConnectOptions
 *
 * @property {?number} onlineTimeout - The number of milliseconds to wait
 * until the device under tests is online. No wait is going to be performed
 * if the timeout is not set. It is recommended to provide this value if
 * `connect` is called right after device is booted, so not all the required
 * device services have been started yet.
 */

/**
 * Initializes idb and companion processes if necessary and
 * assigns path properties. It is mandatory to call this method before
 * one can start using IDB instance,
 *
 * @throws {Error} If mandatory idb executables are not present on the
 * localhost or there was a failure while starting/detecting them
 */
systemCallMethods.connect = async function connect (opts = {}) {
  const {
    onlineTimeout,
  } = opts;

  log.debug(`Connecting ${IDB_EXECUTABLE} service to '${this.udid}'`);

  const binaryPaths = {};
  for (const binary of [IDB_EXECUTABLE, IDB_COMPANION_EXECUTABLE]) {
    try {
      binaryPaths[binary] = await fs.which(binary);
    } catch (e) {
      throw new Error(`'${binary}' has not been found in PATH. ` +
        `Is it installed? Read https://www.fbidb.io for more details`);
    }
  }

  let grpcPort = DEFAULT_COMPANION_GRPC_PORT;
  log.debug(`Starting companion: '${binaryPaths[IDB_COMPANION_EXECUTABLE]}'`);
  const companionProc = new SubProcess(binaryPaths[IDB_COMPANION_EXECUTABLE], ['--udid', this.udid]);
  let listeners = {
    'lines-stdout': null,
    'lines-stderr': null,
    exit: null,
  };
  const cleanupListeners = () => {
    _.toPairs(listeners)
      .filter(([, v]) => _.isFunction(v))
      .map(([k, v]) => companionProc.removeListener(k, v));
    listeners = {};
  };
  try {
    await companionProc.start(0);

    await new B((resolve, reject) => {
      for (const outType of ['stderr', 'stdout']) {
        const eventName = `lines-${outType}`;
        listeners[eventName] = (lines) => {
          for (const line of lines) {
            if (_.isEmpty(_.trim(line))) {
              continue;
            }

            if (this.verbose) {
              log.debug(`[${IDB_COMPANION_EXECUTABLE} ${outType}] ${line}`);
            }

            // check for marker that things are ready to go
            const readyMatch = COMPANION_STARTUP_REGEXP.exec(line);
            if (readyMatch) {
              // find the port and save, so idb can connect
              grpcPort = readyMatch[1];
              resolve();
            } else {
              // check if there has been an error
              const errorMatch = COMPANION_STARTUP_ERROR_REGEXP.exec(line);
              if (errorMatch) {
                reject(new Error(errorMatch[1]));
              }
            }
          }
        };
        companionProc.on(eventName, listeners[eventName]);
      }

      listeners.exit = (code, signal) => {
        cleanupListeners();
        const message = `${IDB_COMPANION_EXECUTABLE} exited with code '${code}' from signal '${signal}'`;
        log.debug(message);
        reject(new Error(message));
      };
      companionProc.once('exit', listeners.exit);
    }).timeout(
      COMPANION_STARTUP_TIMEOUT_SEC * 1000,
      `Was unable to acquire a GRPC port after ${COMPANION_STARTUP_TIMEOUT_SEC}s timeout`
    );
  } catch (err) {
    cleanupListeners();
    if (companionProc.isRunning) {
      try {
        await companionProc.stop();
      } catch (ign) {}
    }
    log.error(`Failed to start ${IDB_COMPANION_EXECUTABLE}: ${err.message}`);
    throw err;
  }

  log.debug(`${IDB_COMPANION_EXECUTABLE} is listening on GRPC port '${grpcPort}'`);

  try {
    try {
      await tpExec(IDB_EXECUTABLE, ['connect', this.udid, grpcPort]);
    } catch (connectionError) {
      await retryInterval(2, 100, async () => {
        await this.disconnect();
        try {
          await tpExec(IDB_EXECUTABLE, ['kill']);
        } catch (ign) {}
        await tpExec(IDB_EXECUTABLE, ['connect', this.udid, grpcPort]);
      });
    }
  } catch (e) {
    if (e.stderr || e.stdout) {
      log.debug(e.stderr || e.stdout);
    }
    throw new Error(`Cannot start ${IDB_EXECUTABLE} service for the device '${this.udid}'. ` +
      `Check the server log for more details.`);
  }
  log.info(`Successfully established the connection to ${IDB_EXECUTABLE} service for '${this.udid}'`);

  if (onlineTimeout) {
    await this.waitForDevice(onlineTimeout);
  }

  this.executable.path = binaryPaths[IDB_EXECUTABLE];
  this.companion.path = binaryPaths[IDB_COMPANION_EXECUTABLE];
};

/**
 * Blocks until the device under test starts responding to idb commands.
 * The device must be booted/online and idb must be already connected for that to happen
 *
 * @param {?number} timeoutMs [10000] - The number of milliseconds to wait
 * until the device under tests is online. The method will return immediately
 * if the timeout is falsy
 * @throws {Error} if the device is not responding within the given timeout
 */
systemCallMethods.waitForDevice = async function waitForDevice (timeoutMs = 10000) {
  if (!timeoutMs) {
    log.debug('No timeout is provided, so not waiting until the device is online');
    return;
  }

  log.debug(`Waiting up to ${timeoutMs}ms for the device to be online`);
  const timer = new timing.Timer().start();
  let lastError = null;
  try {
    await waitForCondition(async () => {
      try {
        await this.exec(['ui', 'describe-all']);
        return true;
      } catch (e) {
        lastError = e.stderr || e.message;
        return false;
      }
    }, {
      waitMs: timeoutMs,
      intervalMs: 300,
    });
  } catch (e) {
    throw new Error(`The device '${this.udid}' is not responding to idb requests after ${timeoutMs}ms timeout. ` +
      `Original error: ${lastError || e.message}`);
  }
  log.debug(`The device '${this.udid}' is online and ready to accept idb commands in ` +
    `${timer.getDuration().asSeconds.toFixed(3)}s`);
};

/**
 * Performs cleanup of obsolete companion processes
 * The daemon process is left untouched, because killing it might
 * potentially affect other parallel sessions. Nothing
 * is done if no obsolete processes are found.
 */
systemCallMethods.disconnect = async function disconnect () {
  log.debug(`Disconnecting ${IDB_EXECUTABLE} service from '${this.udid}'`);

  try {
    await tpExec(this.executable.path, ['disconnect', this.udid]);
  } catch (ign) {}

  const companionPids = await getPids(COMPANION_PGREP_PATTERN(this.udid));
  if (_.isEmpty(companionPids)) {
    return;
  }

  log.debug(`Cleaning up ${companionPids.length} obsolete ${IDB_COMPANION_EXECUTABLE} ` +
    `process${companionPids.length === 1 ? '' : 'es'}`);
  await tpExec('kill', ['-2', ...companionPids]);
};

/**
 * Execute the given idb command.
 *
 * @param {Array.<string>} cmd - The actual idb command without arguments/params.
 * @param {Array<string>} args - Optional command arguments.
 * @param {Object} opts - Additional options mapping. See
 *                        {@link https://github.com/appium/node-teen_process}
 *                        for more details.
 * @return {string} - Command's stdout.
 * @throws {Error} If the command returned non-zero exit code.
 */
systemCallMethods.exec = async function exec (cmd, args = [], opts = {}) {
  if (!cmd) {
    throw new Error('You need to pass in a command to exec()');
  }
  cmd = _.isArray(cmd) ? cmd : [cmd];

  opts = _.cloneDeep(opts);
  // setting default timeout for each command to prevent infinite wait.
  opts.timeout = opts.timeout || this.execTimeout || DEFAULT_IDB_EXEC_TIMEOUT;
  opts.timeoutCapName = opts.timeoutCapName || 'execTimeout'; // For error message

  const fullArgs = [...cmd, ...this.executable.defaultArgs, ...args];
  log.debug(`Running '${this.executable.path} ${util.quote(fullArgs)}'`);
  try {
    const {stdout} = await tpExec(this.executable.path, fullArgs, opts);
    return stdout;
  } catch (e) {
    if (util.hasValue(e.code)) {
      e.message = `Error executing ${IDB_EXECUTABLE}. Original error: '${e.message}'; ` +
        `Stdout: '${(e.stdout || '').trim()}'; ` +
        `Stderr: '${(e.stderr || '').trim()}'; ` +
        `Code: '${e.code}'`;
    } else {
      e.message = `Error executing ${IDB_EXECUTABLE}. Original error: '${e.message}'. ` +
        `Try to increase the ${opts.timeout}ms ${IDB_EXECUTABLE} execution timeout represented by '${opts.timeoutCapName}' capability`;
    }
    throw e;
  }
};

/**
 * Creates SubProcess instance of idb for background
 * execution.
 *
 * @param {Array<String>} command desired idb command (e.g.: ["launch"], ["xctest", "run", "ui"])
 * @param {Array<String>} args additional idb arguments
 * @returns {SubProcess}
 */
systemCallMethods.createSubProcess = function createSubProcess (command = [], args = [], opts = {}) {
  const idbArgs = [...command, ...this.executable.defaultArgs, ...args];
  log.debug(`Creating ${IDB_EXECUTABLE} subprocess with args: ${util.quote(args)}`);
  return new SubProcess(this.executable.path, idbArgs, opts);
};

export default systemCallMethods;
