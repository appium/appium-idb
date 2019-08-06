import systemCommands from './system-commands';
import appCommands from './app-commands';
import interactionCommands from './interaction-commands';
import accessibilityCommands from './accessibility-commands';
import crashlogCommands from './crashlog-commands';
import miscCommands from './misc-commands';
import xctestCommands from './xctest-commands';


// https://www.fbidb.io/docs/commands
Object.assign(
    systemCommands,
    appCommands,
    interactionCommands,
    accessibilityCommands,
    crashlogCommands,
    miscCommands,
    xctestCommands
);

export default systemCommands;
