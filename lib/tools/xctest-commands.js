import { convertToIDBEnv, fixOutputToArray } from '../helpers';

const xctestCommands = {};

/**
 * @typedef {Object} RunOptions
 *
 * @property {Record<string, any>} [env] Environment variables map to be passed to the test runner
 * @property {any[]} [args] Arguments array to be passed to the test runner
 * @property {string} [testType]
 */

/**
 * Runs an xcuitest on the device or simulator
 *
 * @this {import('../idb.js').IDB}
 * @param {string} testRunnerBundleId The bundle id of the test runner
 * @param {string} appUnderTestBundleId The bundle id of the app under test
 * @param {string} xctestBundleId The bundle id of the xctest package
 * @param {RunOptions} opts The envs and args to be passed to the xcuitest runner
 *
 * @returns {Promise<import('teen_process').SubProcess>}
 */
xctestCommands.runXCUITest = async function runXCUITest (
  testRunnerBundleId, appUnderTestBundleId, xctestBundleId, opts = {}
) {
  const uiTestProcess = this.createSubProcess(
    ['xctest', 'run', opts.testType || 'ui'],
    [
      ...(opts.args || []),
      xctestBundleId,
      appUnderTestBundleId,
      testRunnerBundleId,
    ],
    {env: convertToIDBEnv(opts.env ?? null) ?? undefined}
  );
  await uiTestProcess.start(0);
  return uiTestProcess;
};

/**
 * Installs a xctest bundle on the device or simulator
 *
 * @this {import('../idb.js').IDB}
 * @param {string} xctestBundlePath the path of the xctest bundle
 * @returns {Promise<string>} the bundle id of xctest bundle that was installed
 */
xctestCommands.installXCTestBundle = async function installXCTestBundle (xctestBundlePath) {
  const output = await this.exec(['xctest', 'install'], ['--json', xctestBundlePath]);
  try {
    const object = JSON.parse(output);
    return object.installedTestBundleId;
  } catch (e) {
    throw new Error(`Failed to parse '${output}' into json object: ${e.message}`);
  }
};

/**
 * Lists all the xctest bundles installed on a device or a simulator
 * @this {import('../idb.js').IDB}
 */
xctestCommands.listXCTestBundles = async function listXCTestBundles () {
  const output = await this.exec(['xctest', 'list'], ['--json']);
  const bundles = fixOutputToArray(output);
  return bundles.map((bundle) => bundle.bundle_id);
};

/**
 * Lists all the xctest bundles installed on a device or a simulator
 * @this {import('../idb.js').IDB}
 * @param {string} xctestBundleId the bundle id of the xctest
 */
xctestCommands.listXCTestsInTestBundle = async function listXCTestBundles (xctestBundleId) {
  const output = await this.exec(['xctest', 'list-bundle'], ['--json', xctestBundleId]);
  try {
    return JSON.parse(output);
  } catch (e) {
    throw new Error(`Failed to parse '${output}' into json object: ${e.message}`);
  }
};


export default xctestCommands;
