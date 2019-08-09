import { fixOutputToArray } from '../helpers';
import _ from 'lodash';

const xctestCommands = {};
const IDB_ENV_PREFIX = 'IDB_';

/**
 * @typedef {Object} RunOptions
 *
 * @property {string} env Environment variables to be passed to the test runner
 * @property {Array} args Arguments to be passed to the test runner
 */

/**
 * Runs an xcuitest on the device or simulator
 * @param {string} testRunnerBundleId The bundle id of the test runner
 * @param {string} appUnderTestBundleId The bundle id of the app under test
 * @param {string} xctestBundleId The bundle id of the xctest package
 * @param {RunOptions} opts The envs and args to be passed to the xcuitest runner
 * @returns {SubProcess}
 */
xctestCommands.runXCUITest = async function runXCUITest (testRunnerBundleId, appUnderTestBundleId, xctestBundleId, opts = {}) {
  const uiTestProcess = this.createSubProcess([
    'xctest', 'run',
    'ui', xctestBundleId,
    appUnderTestBundleId, testRunnerBundleId,
    ...(opts.args || [])
  ], {
    env: convertToIDBEnv(opts)
  });
  await uiTestProcess.start(0);
  return uiTestProcess;
};

function convertToIDBEnv (opts) {
  if (_.isEmpty(opts.env)) {
    return null;
  }
  const env = {};
  for (const [key, value] of Object.entries(opts.env)) {
    env[IDB_ENV_PREFIX + key] = value;
  }
  return env;
}

/**
 * Installs a xctest bundle on the device or simulator
 * @param {string} xctestBundlePath the path of the xctest bundle
 * @returns {string} the bundle id of xctest bundle that was installed
 */
xctestCommands.installXCTestBundle = async function installXCTestBundle (xctestBundlePath) {
  const output = await this.exec(['xctest', 'install', xctestBundlePath, '--json']);
  try {
    const object = JSON.parse(output);
    return object.installedTestBundleId;
  } catch (e) {
    throw new Error(`Failed to parse '${output}' into json object`);
  }
};

/**
 * Lists all the xctest bundles installed on a device or a simulator
 * @returns {Array.<string>} the list of the xctest bundle ids
 */
xctestCommands.listXCTestBundles = async function listXCTestBundles () {
  const bundles = fixOutputToArray(await this.exec(['xctest', 'list', '--json']));
  return bundles.map(bundle => bundle.bundle_id);
};


export default xctestCommands;
