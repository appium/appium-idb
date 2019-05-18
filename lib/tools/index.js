import systemCommands from './system-commands';
import appCommands from './app-commands';
import interactionCommands from './interaction-commands';

// https://www.fbidb.io/docs/commands
Object.assign(
    systemCommands,
    appCommands,
    interactionCommands,
);

export default systemCommands;
