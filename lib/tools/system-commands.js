import B from 'bluebird';
import { fs, util } from 'appium-support';
import { exec as tpExec, SubProcess } from 'teen_process';
import _ from 'lodash';
import { quote } from 'shell-quote';
import { retryInterval, waitForCondition } from 'asyncbox';
import {
  getPids, DEFAULT_IDB_EXEC_TIMEOUT, IDB_EXECUTABLE,
  IDB_COMPANION_EXECUTABLE, DEFAULT_IDB_PORT,
} from '../helpers';
import log from '../logger.js';


const PROCESS_INIT_TIMEOUT = 5000;
const COMPANION_PGREP_PATTERN = (udid) =>
  `${IDB_COMPANION_EXECUTABLE}.*--udid[[:space:]]+${udid}`;

function buildDaemonArgs (opts = {}) {
  const {
    port,
    grpcPort,
  } = opts;

  const result = [
    'daemon',
    '--notifier-path', IDB_COMPANION_EXECUTABLE,
  ];
  if (port) {
    result.push('--port', port);
  }
  if (grpcPort) {
    result.push('--grpc-port', grpcPort);
  }
  return result;
}


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

  try {
    try {
      await tpExec(IDB_EXECUTABLE, ['connect', this.udid]);
    } catch (connectionError) {
      await retryInterval(2, 100, async () => {
        await this.disconnect();
        try {
          await tpExec(IDB_EXECUTABLE, ['kill']);
        } catch (ign) {}
        let isStartupMonitorEnabled = true;
        try {
          const daemon = new SubProcess(IDB_EXECUTABLE, buildDaemonArgs(this.executable));
          let daemonOutput = '';
          daemon.on('output', (stdout, stderr) => {
            if (isStartupMonitorEnabled && _.trim(stdout || stderr)) {
              daemonOutput += `[daemon] ${stdout || stderr}\n`;
            }
          });
          try {
            await daemon.start(null, PROCESS_INIT_TIMEOUT);
            await B.delay(300);
          } catch (ign) {}
          if (daemon.isRunning) {
            log.debug(`${IDB_EXECUTABLE} daemon started on port ${this.executable.port || DEFAULT_IDB_PORT}`);
          } else {
            if (!daemonOutput.includes('address already in use')) {
              const message = `${IDB_EXECUTABLE} daemon has failed to start: ${daemonOutput}`;
              log.warn(message);
              throw new Error(message);
            }
            log.debug(`The port ${this.executable.port || DEFAULT_IDB_PORT} is already in use. ` +
              `Assuming it is used by ${IDB_EXECUTABLE} daemon`);
          }
          await tpExec(IDB_EXECUTABLE, ['connect', this.udid]);
        } catch (connectionError2) {
          if (connectionError2.stderr || connectionError2.stdout) {
            log.debug(connectionError2.stderr || connectionError2.stdout);
          }
          throw connectionError2;
        } finally {
          isStartupMonitorEnabled = false;
        }
      });
    }
  } catch (e) {
    if (e.stderr) {
      log.debug(e.stderr);
    }
    throw new Error(`Cannot start ${IDB_EXECUTABLE} service for '${this.udid}'. ` +
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

  log.debug(`Waiting ${timeoutMs}ms until the device is online`);
  const started = process.hrtime();
  try {
    await waitForCondition(async () => {
      try {
        await tpExec(IDB_EXECUTABLE, ['describe', '--json', '--udid', this.udid]);
        return true;
      } catch (e) {
        return false;
      }
    }, {
      waitMs: timeoutMs,
      intervalMs: 300,
    });
  } catch (e) {
    throw new Error(`The device '${this.udid}' is not responding to idb requests after ${timeoutMs}ms timeout. ` +
      `Original error: ${e.stderr || e.message}`);
  }
  const [seconds, ns] = process.hrtime(started);
  log.debug(`The device '${this.udid}' is online and is ready to accept idb commands in ` +
    `${(seconds + ns / 1e9).toFixed(2)}s`);
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
 * @param {Array.<string>} cmd - The array of rest command line parameters
 *                      or a single string parameter.
 * @param {Object} opts - Additional options mapping. See
 *                        {@link https://github.com/appium/node-teen_process}
 *                        for more details.
 * @return {string} - Command's stdout.
 * @throws {Error} If the command returned non-zero exit code.
 */
systemCallMethods.exec = async function exec (cmd, opts = {}) {
  if (!cmd) {
    throw new Error('You need to pass in a command to exec()');
  }
  cmd = _.isArray(cmd) ? cmd : [cmd];

  opts = _.cloneDeep(opts);
  // setting default timeout for each command to prevent infinite wait.
  opts.timeout = opts.timeout || this.execTimeout || DEFAULT_IDB_EXEC_TIMEOUT;
  opts.timeoutCapName = opts.timeoutCapName || 'execTimeout'; // For error message

  const args = [...cmd, ...this.executable.defaultArgs];
  log.debug(`Running '${this.executable.path} ${quote(args)}'`);
  try {
    const {stdout} = await tpExec(this.executable.path, args, opts);
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
 * @param {Array<String>} args additional idb arguments
 * @returns {SubProcess}
 */
systemCallMethods.createSubProcess = function createSubProcess (args = [], opts = {}) {
  const idbArgs = [...args, ...this.executable.defaultArgs];
  log.debug(`Creating ${IDB_EXECUTABLE} subprocess with args: ${quote(args)}`);
  return new SubProcess(this.executable.path, idbArgs, opts);
};

export default systemCallMethods;
