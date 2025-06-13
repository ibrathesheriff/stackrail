import { supabase, SESSION_FILE_DIR, PROJECT_FILE_PATH } from './config.js'
import { authenticateSession } from './auth.js';
import { displayCommandHeader, displaySuccessMessage, displayTable, directoryExists, createDirectory, fileExists, shortenText, isStringOnlyDigits } from './helpers.js'
import * as db from './db.js';
import * as fs from 'node:fs/promises';

import chalk from 'chalk'
import inquirer from 'inquirer'
import { createSpinner } from 'nanospinner'

const projectNicknameRegex = /^[a-zA-Z0-9]+$/;

export async function handlePop() {
    console.log('Handler: Start working on the highest priority task');
}

export async function handlePush() {
    console.log('Handler: Add a new highest priority task');
}

async function getProjectDetails() {
    const questions = [
        {
            type: 'input',
            name: 'projectName',
            message: 'Enter the project name:',
            validate: (input) => {
                if (input.length >= 1) {
                    return true;
                }
                return 'Please enter a valid name for the project.';
            },
        },
        {
            type: 'input',
            name: 'problem',
            message: 'Which problem is the project tackling?',
            validate: (input) => {
                if (input.length >= 1) {
                    return true;
                }
                return 'Please enter the problem the project is looking to solve.';
            },
        },
        {
            type: 'input',
            name: 'description',
            message: 'Enter a description for the project:',
            validate: (input) => {
                if (input.length >= 1) {
                    return true;
                }
                return 'Please enter a valid description for the project.';
            },
        },
        {
            type: 'input',
            name: 'nickname',
            message: 'Enter a nickname for the project:',
            validate: (input) => {
                if (input.length >= 1 && projectNicknameRegex.test(input)) {
                    return true;
                }
                return 'Please enter a valid nickname for the project.';
            },
        },

    ];

    try {
        const answers = await inquirer.prompt(questions);
        return answers; // Returns { email: 'user@example.com', password: 'mysecretpassword' }
    } catch (error) {
        if (error.isTtyError) {
            // Prompt couldn't be rendered in the current environment
            console.error(chalk.red('Error: Prompt not supported in this environment.'));
        } else {
            // Other errors
            console.error(chalk.red('Error getting input:'), error.message);
        }
        process.exit(1); // Exit the CLI if input cannot be obtained
    }
}

async function createProject() {
    displayCommandHeader('Create a New Project', null)
    const sessionDirectoryFound = await directoryExists(SESSION_FILE_DIR);
    if (!sessionDirectoryFound) {
        await createDirectory(SESSION_FILE_DIR);
    }

    const projectInfo = await getProjectDetails();

    const result = await db.insertProject(supabase, projectInfo.projectName, projectInfo.problem, projectInfo.description, projectInfo.nickname);

    const projectData = {
        id: result[0].id,
        projectName: projectInfo.projectName,
        problem: projectInfo.problem,
        description: projectInfo.description,
        nickname: projectInfo.nickname,
    };

    await fs.writeFile(PROJECT_FILE_PATH, JSON.stringify(projectData, null, 2));

    await displaySuccessMessage(`\n'${projectInfo.projectName}' was successfully created`);

    console.log(chalk.gray(`\nYou have been switch to the '${projectInfo.projectName}' project...`))
}

export async function handleProject(argv) {
    const authenticated = await authenticateSession(supabase);
    if (!authenticated) {
        return;
    }
    if (argv.new) {
        await createProject();
    } else if (argv.list) {
        const spinner = createSpinner('Loading your projects...').start();
        // list all the Dev's projects
        const projectRecords = await db.selectProjects(supabase);
        if (projectRecords === null) {
            spinner.error({ text: chalk.red("Failed to retrieve your projects") });
            return;
        }
        const projects = [];
        projectRecords.forEach(project => {
            projects.push([
                project.id,
                new Date(project.created_at).toLocaleDateString(),
                project.project_name,
                project.nickname,
                shortenText(project.problem, 75)
            ]);
        });
        spinner.success({ text: chalk.gray("Your Projects:\n") });
        displayTable(['ID', 'Created', 'Name', 'Nickname', 'Problem'], projects);
    } else if (argv.switch) {
        const spinner = createSpinner('Searching for the project...').start();
        const projectId = argv.switch;
        let column = null;
        if (isStringOnlyDigits(projectId)) {
            // query using the project ID column
            column = 'id';
        } else {
            // query by nickname
            column = 'nickname';
        }
        const result = await db.selectProjectBy(supabase, column, projectId);
        if (result === null) {
            spinner.error({ text: chalk.red(`Failed to retrieve the project with the ${column} '${projectId}'`) });
            return;
        } else if (result.length === 0) {
            spinner.error({ text: chalk.red(`No such project exists ${column}='${projectId}'`) });
            return;
        }
        spinner.success({ text: chalk.green(`Your workspace has been switch to the project '${result[0].project_name}'`) });
    } else {
        // display the information of the current project the Dev is working on
        const projectFileExists = await fileExists(PROJECT_FILE_PATH);
        if (!projectFileExists) {
            console.log(chalk.red("You are not currently working on a problem. Either create a project or switch to a project"));
            return;
        }
        const projectFileData = await fs.readFile(PROJECT_FILE_PATH, 'utf8');
        const projectData = JSON.parse(projectFileData);
        console.log(chalk.gray("Current project:\n"));
        console.log("Project name:", chalk.cyan(projectData.projectName));
        console.log("Problem:", chalk.cyan(projectData.problem));
        console.log("Description:", chalk.cyan(projectData.description));
        console.log("Nickname:", chalk.cyan(projectData.nickname));
    }
}

export async function handleAdd(argv) {
    console.log("Adding a stackrail...");
    console.log('DEBUG - argv:', argv);
    console.log('DEBUG - argv.rail:', argv.rail, typeof argv.rail);
    console.log('DEBUG - argv.bug:', argv.bug, typeof argv.bug);
    if (argv.rail) {
        console.log("Handler: adding rail - id or title");
    } else if (argv.bug) {
        console.log("Handler: adding bug");
    } else {
        // normal add
        console.log(`Handler: normal add ${argv.rail} ${argv.bug} ${argv}`);
    }
}

export async function handleTask(argv) {
    if (argv.modify) {
        const taskId = argv.modify;
        console.log(`Handler: Modifying task with ID: ${taskId}`);
        // await modifyStackrailTask(taskId);
    } else if (argv.delete) {
        const taskId = argv.delete;
        console.log(`Handler: Deleting task with ID: ${taskId}`);
        // await deleteStackrailTask(taskId);
    } else if (argv.view) {
        const taskId = argv.view;
        console.log(`Handler: Viewing task with ID: ${taskId}`);
        // await viewStackrailTask(taskId);
    } else if (argv.roll) {
        const taskId = argv.roll;
        console.log(`Handler: Rolling task with ID: ${taskId}`);
        // await rollStackrailTask(taskId);
    }
}

export async function handleList(argv) {
    if (argv.all) {
        console.log('Listing all stackrail items.');
        // await listStackrailsAll();
    } else if (argv.rail) {
        console.log('Listing "rail" specific stackrail items.');
        // await listStackrailsRail();
    } else if (argv.ready) {
        console.log('Listing stackrail items with status: Ready.');
        // await listStackrailsByStatus('ready');
    } else if (argv.inProgress) {
        console.log('Listing stackrail items with status: In Progress.');
        // await listStackrailsByStatus('in-progress');
    } else if (argv.testing) {
        console.log('Listing stackrail items with status: Testing.');
        // await listStackrailsByStatus('testing');
    } else if (argv.complete) {
        console.log('Listing stackrail items with status: Complete.');
        // await listStackrailsByStatus('complete');
    } else if (argv.blocked) {
        console.log('Listing stackrail items with status: Blocked.');
        // await listStackrailsByStatus('blocked');
    } else {
        // Default behavior for `stackrail list` with no flags
        console.log('Listing standard stackrail items (default view).');
        // await listStackrailsDefault();
    }
}