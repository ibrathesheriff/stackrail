#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { STACKRAIL_VERSION } from './config.js'
// import handlers
import { handlePop, handlePush, handleProject, handleRail, handleAdd, handleTask, handleList } from './handlers.js';
import { stackRailJoin, stackRailVerification, stackRailLogin, stackRailLogout } from './auth.js';

// Create yargs instance
const argv = yargs(hideBin(process.argv))
    .scriptName('stackrail')
    .usage('Usage: $0 <command> [options]')
    .version(STACKRAIL_VERSION)
    .help('h')
    .alias('h', 'help')

    // 'pop' command
    .command(
        'pop',
        'Start working on the highest scoring task',
        (yargs) => {
            return yargs;
        },
        async (argv) => {
            await handlePop();
        }
    )

    // 'push' command
    .command(
        'push',
        'Create a new task and guarantee it has the highest priority',
        (yargs) => {
            return yargs;
        },
        async (argv) => {
            await handlePush();
        }
    )

    // 'join' command
    .command(
        'join',
        'Signs you up for a StackRail account',
        (yargs) => {
            return yargs;
        },
        async (argv) => {
            await stackRailJoin();
        }
    )

    // 'verify' command
    .command(
        'verify',
        'Verify your StackRail account',
        (yargs) => {
            return yargs;
        },
        async (argv) => {
            await stackRailVerification();
        }
    )

    // 'login' command
    .command(
        'login',
        'Logs into your StackRail account',
        (yargs) => {
            return yargs;
        },
        async (argv) => {
            await stackRailLogin();
        }
    )

    // 'logout' command
    .command(
        'logout',
        'Logs out of your StackRail account',
        (yargs) => {
            // No specific options needed for logout, usually.
            return yargs;
        },
        async (argv) => {
            await stackRailLogout();
        }
    )

    // 'project' command
    .command(
        'project',
        'Manage your StackRail projects',
        (yargs) => {
            return yargs
                .option('new', {
                    type: 'boolean',
                    description: 'Create a new project',
                    conflicts: ['list', 'switch']
                })
                .option('list', {
                    alias: 'l',
                    type: 'boolean',
                    description: 'List all available projects',
                    conflicts: ['new', 'switch']
                })
                .option('switch', {
                    type: 'string',
                    description: 'Switch to a different project by its ID',
                    nargs: 1,
                    conflicts: ['new', 'list']
                })
        },
        async (argv) => {
            // Handler for the 'project' command based on the chosen action
            await handleProject(argv);
        }
    )

    .command(
        'rail <title>', // Defines 'rail' command with a required positional 'title' argument
        'Adds a task to Rail (temporary store of partially described tasks)',
        (yargs) => {
            return yargs
                .positional('title', {
                    describe: "The title of the new 'rail' task",
                    type: 'string', // Ensure it's treated as a string
                    demandOption: true, // Make the title mandatory
                })
                .example('stackrail rail "Refactor old API code"', 'Creates a new rail task with the given title.');
        },
        async (argv) => {
            await handleRail(argv.title);
        }
    )

    // 'add' command
    .command('add', 'Add a new rail', (yargs) => {
        return yargs
            .option('rail', {
                alias: 'r',
                describe: 'Specify rail type',
                type: 'string',
                nargs: 1,
                conflicts: 'bug'
            })
            .option('bug', {
                alias: 'b',
                type: 'boolean',
                describe: 'Specify rail type',
                conflicts: 'rail'
            });
    },
    async (argv) => {
        await handleAdd(argv);
    })

    // 'task' command
    .command(
        'task',
        'Perform actions on a specific task by its identifier',
        (yargs) => {
            return yargs
                .option('modify', {
                    type: 'string', // The <id> will be the string value
                    description: 'Modify an existing task by its ID',
                    nargs: 1, // Requires one argument (the ID)
                    conflicts: ['delete', 'view', 'roll'] // Ensures only one action is chosen
                })
                .option('delete', {
                    type: 'string',
                    description: 'Delete a task by its ID',
                    nargs: 1,
                    conflicts: ['modify', 'view', 'roll']
                })
                .option('view', {
                    type: 'string',
                    description: 'View details of a task by its ID',
                    nargs: 1,
                    conflicts: ['modify', 'delete', 'roll']
                })
                .option('roll', {
                    type: 'string',
                    description: 'Roll a task to a different status or state by its ID',
                    nargs: 1,
                    conflicts: ['modify', 'delete', 'view']
                })
                .check((argv) => {
                    // Check if exactly one of the task actions is provided
                    const actionsProvided = [
                        argv.modify, argv.delete, argv.view, argv.roll
                    ].filter(Boolean).length;

                    if (actionsProvided === 0) {
                        throw new Error('You must specify one action for the task command: --modify, --delete, --view, or --roll.');
                    }
                    // The conflicts array handles if more than one are provided,
                    // so we only need to enforce that *at least one* is present.
                    return true;
                });
        },
        async (argv) => {
            // Handler for the 'task' command based on the chosen action
            await handleTask(argv);
            // Note: The .check() above ensures that one of these will always be true
        }
    )

    // 'list' command
    .command(
        'list',
        'Lists stackrail items, optionally filtered by status or type',
        (yargs) => {
            return yargs
                .option('all', {
                    alias: 'a',
                    type: 'boolean',
                    description: 'List all items (including hidden/archived)',
                    conflicts: ['rail', 'ready', 'in-progress', 'testing', 'complete', 'blocked']
                })
                .option('rail', {
                    alias: 'r',
                    type: 'boolean', // Or 'string' if it expects a rail ID, e.g., list -rail <id>
                    description: 'List items specifically marked as "rail" tasks',
                    conflicts: ['all', 'ready', 'in-progress', 'testing', 'complete', 'blocked']
                })
                .option('ready', {
                    type: 'boolean',
                    description: 'List items with "ready" status',
                    conflicts: ['all', 'rail', 'in-progress', 'testing', 'complete', 'blocked']
                })
                .option('in-progress', {
                    type: 'boolean',
                    description: 'List items with "in-progress" status',
                    conflicts: ['all', 'rail', 'ready', 'testing', 'complete', 'blocked']
                })
                .option('testing', {
                    type: 'boolean',
                    description: 'List items with "testing" status',
                    conflicts: ['all', 'rail', 'ready', 'in-progress', 'complete', 'blocked']
                })
                .option('complete', {
                    type: 'boolean',
                    description: 'List items with "complete" status',
                    conflicts: ['all', 'rail', 'ready', 'in-progress', 'testing', 'blocked']
                })
                .option('blocked', {
                    type: 'boolean',
                    description: 'List items with "blocked" status',
                    conflicts: ['all', 'rail', 'ready', 'in-progress', 'testing', 'complete']
                })
                // Add a check to ensure at most one status/filter option is used
                .check((argv) => {
                    const filtersUsed = [
                        argv.all, argv.rail, argv.ready, argv.inProgress,
                        argv.testing, argv.complete, argv.blocked
                    ].filter(Boolean).length;

                    if (filtersUsed > 1) {
                        throw new Error('Only one filter option (--all, --rail, or a status filter) can be used at a time.');
                    }
                    return true;
                });
        },
        async (argv) => {
            // Handler for the 'list' command
            await handleList(argv);
        }
    )
    .demandCommand(1, 'You need at least one command before moving on')
    .strict()
    .parse();

