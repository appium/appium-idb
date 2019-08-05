import os from 'os';

const DELIMETER = ' | ';

const xctestCommands = {};

/**
 * Runs an xcuitest on the device or simulator
 * @param {string} testRunnerBundleId The bundle id of the test runner
 * @param {string} appUnderTestBundleId The bundle id of the app under test
 * @param {string} xctestBundleId The bundle id of the xctest package
 * @returns {SubProcess}
 */
xctestCommands.runXCUITest = async function runXCUITest (testRunnerBundleId, appUnderTestBundleId, xctestBundleId) {
  const uiTestProcess = this.createSubProcess([
    'xctest', 'run',
    'ui', xctestBundleId,
    appUnderTestBundleId, testRunnerBundleId
  ]);
  await uiTestProcess.start(0);
  return uiTestProcess;
};

/**
 * Installs a xctest bundle on the device or simulator
 * @param {string} xctestBundlePath the path of the xctest bundle
 * @returns {string} the bundle id of xctest bundle that was installed
 */
xctestCommands.installXCTestBundle = async function installXCTestBundle (xctestBundlePath) {
  const output = await this.exec(['xctest', 'install', xctestBundlePath]);
  return output.replace('Installed: ', '').trim();
};

/**
 * Lists all the xctest bundles installed on a device or a simulator
 * @returns {Array.<string>} the list of the xctest bundle ids
 */
xctestCommands.listXCTestBundles = async function listXCTestBundles () {
  const output = await this.exec(['xctest', 'list']);
  const ids = [];
  for (const line of output.split(os.EOL)) {
    // The data always come as the following example 'com.facebook.wda.runner | WebDriverAgentRunner | x86_64'
    const match = line.split(DELIMETER);
    if (match.length !== 3) {
      continue;
    }
    ids.push(match[0].trim());
  }
  return ids;
};


export default xctestCommands;
