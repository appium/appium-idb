import B from 'bluebird';
import { fs, util } from 'appium-support';
import { exec as tpExec, SubProcess } from 'teen_process';
import _ from 'lodash';
import { quote } from 'shell-quote';
import { waitForCondition } from 'asyncbox';
import {
  getPids, DEFAULT_IDB_EXEC_TIMEOUT, IDB_EXECUTABLE,
  IDB_COMPANION_EXECUTABLE, fixOutputToArray,
} from '../helpers';
import log from '../logger.js';


const PROCESS_INIT_TIMEOUT = 5000;
const COMPANION_PGREP_PATTERN = (udid) =>
  `${IDB_COMPANION_EXECUTABLE}.*--udid[[:space:]]+${udid}`;

function buildCompanionArgs (udid, opts = {}) {
  const {
    port,
    grpcPort,
    logPath,
  } = opts;

  const companionArgs = [
    '--udid', udid,
  ];
  if (port) {
    companionArgs.push('--port', port);
  }
  if (grpcPort) {
    companionArgs.push('--grpc-port', grpcPort);
  }
  if (logPath) {
    companionArgs.push('--log-file-path', logPath);
  }
  return companionArgs;
}

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
 * Initializes idb and companion processes if necessary and
 * assigns path properties. It is mandatory to call this method before
 * one can start using IDB instance,
 *
 * @throws {Error} If mandatory idb executables are not present on the
 * localhost or there was a failure while starting/detecting them
 */
systemCallMethods.connect = async function connect () {
  const binaryPaths = {};
  for (const binary of [IDB_EXECUTABLE, IDB_COMPANION_EXECUTABLE]) {
    try {
      binaryPaths[binary] = await fs.which(binary);
    } catch (e) {
      throw new Error(`'${binary}' has not been found in PATH. ` +
        `Is it installed? Read https://www.fbidb.io for more details`);
    }
  }

  let isStartupMonitorEnabled = true;
  try {
    if (_.isEmpty(await getPids(COMPANION_PGREP_PATTERN(this.udid)))) {
      const args = buildCompanionArgs(this.udid, this.companion);
      const comp = new SubProcess(IDB_COMPANION_EXECUTABLE, args);
      comp.on('output', (stdout, stderr) => {
        if (isStartupMonitorEnabled && stderr) {
          log.debug(`[${IDB_COMPANION_EXECUTABLE}] ${stderr}`);
        }
      });
      try {
        await comp.start(null, PROCESS_INIT_TIMEOUT);
      } catch (e) {
        throw new Error(`Cannot start ${IDB_COMPANION_EXECUTABLE}. Original error: ${e.message}`);
      }
      await B.delay(300);
      if (!comp.isRunning) {
        throw new Error(`${IDB_COMPANION_EXECUTABLE} has failed to start`);
      }
      log.info(`${IDB_COMPANION_EXECUTABLE} has been started with args ${JSON.stringify(args)}`);
    } else {
      log.info(`${IDB_COMPANION_EXECUTABLE} is already running for the device '${this.udid}'`);
    }

    const daemon = new SubProcess(IDB_EXECUTABLE, buildDaemonArgs(this.executable));
    let daemonStderr = '';
    daemon.on('output', (stdout, stderr) => {
      if (isStartupMonitorEnabled && stderr) {
        daemonStderr += `${stderr}\n`;
      }
    });
    try {
      await daemon.start(null, PROCESS_INIT_TIMEOUT);
      await B.delay(300);
    } catch (ign) {}
    if (daemon.isRunning) {
      log.info(`${IDB_EXECUTABLE} daemon is running on port ${this.port}`);
    } else {
      if (!daemonStderr.includes('address already in use')) {
        throw new Error(`${IDB_EXECUTABLE} daemon has failed to start: ${daemonStderr}`);
      }
      log.info(`${this.port} is already in use. Assuming it is used by ${IDB_EXECUTABLE} daemon`);
    }

    const {stdout} = await tpExec(IDB_EXECUTABLE, ['list-targets', '--json']);
    if (!fixOutputToArray(stdout).some((x) => _.toUpper(x.udid) === _.toUpper(this.udid))) {
      throw new Error(`The device '${this.udid}' is unknown. Only these devices are known ` +
        `to ${IDB_EXECUTABLE}: ${stdout}`);
    }

    try {
      await waitForCondition(async () => {
        try {
          await tpExec(IDB_EXECUTABLE, ['describe', '--udid', this.udid]);
          return true;
        } catch (e) {
          return false;
        }
      }, {
        waitMs: 5000,
        intervalMs: 500,
      });
    } catch (e) {
      throw new Error(`Cannot connect to ${IDB_COMPANION_EXECUTABLE} for '${this.udid}'. ` +
        `Check the server log for more details.`);
    }
    log.info(`Successfully established the connection to ${IDB_COMPANION_EXECUTABLE} for '${this.udid}'`);

    this.executable.path = binaryPaths[IDB_EXECUTABLE];
    this.companion.path = binaryPaths[IDB_COMPANION_EXECUTABLE];
  } finally {
    isStartupMonitorEnabled = false;
  }
};

/**
 * Performs cleanup of obsolete companion processes
 * The daemon process is left untouched, because killing it might
 * potentially affect other parallel sessions. Nothing
 * is done if no obsolete processes are found.
 */
systemCallMethods.disconnect = async function disconnect () {
  try {
    await tpExec(this.executable.path, ['disconnect', this.udid]);
  } catch (ign) {}

  const companionPids = await getPids(COMPANION_PGREP_PATTERN(this.udid));
  if (_.isEmpty(companionPids)) {
    return;
  }

  log.debug(`Cleaning up ${companionPids.length} obsolete ${IDB_COMPANION_EXECUTABLE} ` +
    `process${companionPids.length === 1 ? '' : 'es'}`);
  await tpExec('kill', companionPids);
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
systemCallMethods.createSubProcess = function createSubProcess (args = []) {
  const idbArgs = [...args, ...this.executable.defaultArgs];
  log.debug(`Creating ${IDB_EXECUTABLE} subprocess with args: ${quote(args)}`);
  return new SubProcess(this.executable.path, idbArgs);
};

export default systemCallMethods;
