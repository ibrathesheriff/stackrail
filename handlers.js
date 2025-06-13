import { supabase, SESSION_FILE_DIR, PROJECT_FILE_PATH, DEFAULT_TAGS } from './config.js'
import { authenticateSession } from './auth.js';
import {
    // --- Display & Output ---
    displayCommandHeader,
    displaySuccessMessage,
    displayTable,
    // --- File System Utilities ---
    directoryExists,
    createDirectory,
    fileExists,
    // --- Data & String Processing ---
    shortenText,
    isStringOnlyDigits,
    normalizeTag
} from './helpers.js'
import * as db from './db.js';
import * as fs from 'node:fs/promises';

import chalk from 'chalk'
import inquirer from 'inquirer'
import { createSpinner } from 'nanospinner'

const ADD_NEW_TAGS_OPTION_VALUE = '___ADD_NEW_TAGS___';

const PROJECT_NICKNAME_REGEX = /^[a-zA-Z0-9]+$/;
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

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
                if (input.length >= 1 && PROJECT_NICKNAME_REGEX.test(input)) {
                    return true;
                }
                return 'Please enter a valid nickname for the project.';
            },
        },

    ];

    try {
        const answers = await inquirer.prompt(questions);
        return answers;
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

async function getCurrentProject() {
    const projectFileExists = await fileExists(PROJECT_FILE_PATH);
    if (!projectFileExists) {
        console.log(chalk.red("You are not currently working on a problem. Either create a project or switch to a project"));
        return null;
    }
    const projectFileData = await fs.readFile(PROJECT_FILE_PATH, 'utf8');
    const projectData = JSON.parse(projectFileData);
    return projectData;
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
        displayTable(['ID', 'Created', 'Name', 'Nickname', 'Problem'], projects, 'projects');
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
            spinner.error({ text: chalk.red(`No such project exists with the ${column}, '${projectId}'`) });
            return;
        }
        spinner.success({ text: chalk.green(`Your workspace has been switch to the project '${result[0].project_name}'`) });
    } else {
        // display the information of the current project the Dev is working on
        const projectData = await getCurrentProject();
        if (projectData === null) {
            return;
        }
        console.log(chalk.gray("Current project:\n"));
        console.log("Project name:", chalk.cyan(projectData.projectName));
        console.log("Problem:", chalk.cyan(projectData.problem));
        console.log("Description:", chalk.cyan(projectData.description));
        console.log("Nickname:", chalk.cyan(projectData.nickname));
    }
}

function getTaskQuestions(projectTags) {
    const questions = [
        {
            type: 'input',
            name: 'title',
            message: 'Enter title of the task:',
            validate: (input) => {
                if (input.length >= 1) {
                    return true;
                }
                return 'Please enter a valid title for the task.';
            },
        },
        {
            type: 'input',
            name: 'description',
            message: 'Enter a description of the task:',
            validate: (input) => {
                if (input.length >= 1) {
                    return true;
                }
                return 'Please enter a valid description of the task.';
            },
        },
        {
            type: 'list', // This is the type for single-choice multiple-choice
            name: 'complexity', // The key in the answers object
            message: 'Select the complexity of the task:', // The question message
            choices: [ // The list of options
                { name: 'Easy (less than a day)', value: '0' },
                { name: 'Medium (2-3 days)', value: '1' },
                { name: 'Hard (1-week+)', value: '2' },
                new inquirer.Separator()
            ],
        },
        {
            type: 'list',
            name: 'usersAffected',
            message: `% of users affected ${chalk.gray('(i.e., 1 only a small group, 5 everyone is affected)')}:`,
            choices: [
                { name: '1', value: '1' },
                { name: '2', value: '2' },
                { name: '3', value: '3' },
                { name: '4', value: '4' },
                { name: '5', value: '5' },
                new inquirer.Separator()
            ],
        },
        {
            type: 'list',
            name: 'retention',
            message: `Retention ${chalk.gray('(i.e., 1 not much impact, 5 it will increase it substantially)')}:`,
            choices: [
                { name: '1', value: '1' },
                { name: '2', value: '2' },
                { name: '3', value: '3' },
                { name: '4', value: '4' },
                { name: '5', value: '5' },
                new inquirer.Separator()
            ],
        },
        {
            type: 'list',
            name: 'conversion',
            message: `Conversion ${chalk.gray('(i.e., 1 not much impact, 5 it will increase it substantially)')}:`,
            choices: [
                { name: '1', value: '1' },
                { name: '2', value: '2' },
                { name: '3', value: '3' },
                { name: '4', value: '4' },
                { name: '5', value: '5' },
                new inquirer.Separator()
            ],
        },
        {
            type: 'list',
            name: 'confidence',
            message: `Confidence ${chalk.gray('(how accurate are your scores?)')}:`,
            choices: [
                { name: '1 (not very confident)', value: '1' },
                { name: '2', value: '2' },
                { name: '3 (50-50)', value: '3' },
                { name: '4', value: '4' },
                { name: '5 (100%!)', value: '5' },
                new inquirer.Separator()
            ],
        },
        {
            type: 'checkbox',
            name: 'selectedTags',
            message: 'Select existing tags (use spacebar to select, Enter to confirm):',
            choices: [
                ...projectTags.map(tag => ({ name: tag, value: tag })),
                new inquirer.Separator(),
                { name: chalk.yellow('Add new tag(s) (type below)'), value: ADD_NEW_TAGS_OPTION_VALUE },
                new inquirer.Separator(),
            ],
            loop: false // Don't loop the choices when navigating
        },
    ];
    return questions;
}

async function getTaskDetails(questions, isBug) {
    try {
        const answers = await inquirer.prompt(questions);
        let selectedTags = answers.selectedTags;
        let newTagsInput = [];
        let addNewTagsChosen = selectedTags.includes(ADD_NEW_TAGS_OPTION_VALUE);
        if (addNewTagsChosen) {
            const newTagsQuestion = {
                type: 'input',
                name: 'newTagsString',
                message: 'Enter new tag(s), comma-separated (e.g., "urgent, v2, my_tag"):',
                validate: (input) => {
                    if (input.trim() === '' && selectedTags.length === 0) {
                        return 'You must select at least one tag or enter new tags.';
                    }
                    return true;
                },
                filter: (input) => {
                    // Split by comma, normalize, and filter out empty strings
                    return input.split(',').map(normalizeTag).filter(tag => tag !== '');
                }
            };
            const newTagsAnswers = await inquirer.prompt(newTagsQuestion);
            newTagsInput = newTagsAnswers.newTagsString;
            // remove ADD_NEW_TAGS_OPTION_VALUE from the select tags
            selectedTags = selectedTags.filter(tag => tag !== ADD_NEW_TAGS_OPTION_VALUE);
        }
        const allCollectedTags = [...selectedTags, ...newTagsInput];
        if (isBug) {
            // if the User has prompted this task as a bug the 'bug' tag will ALWAYS be present
            allCollectedTags.push('bug');
        }
        const uniqueNormalizedTags = Array.from(new Set(allCollectedTags.map(normalizeTag)));
        answers.selectedTags = uniqueNormalizedTags;
        return answers;
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

export function startProjectMetadataSpinner() {
    const spinner = createSpinner('Loading workspace metadata').start();
    return spinner;
}

export function stopProjectMetadataSpinner(spinner, projectData) {
    spinner.success({ text: chalk.bgGreen(projectData.projectName + "\n") });
}

export async function loadProjectMetadata(spinner) {
    const authenticated = await authenticateSession(supabase);
    if (!authenticated) {
        spinner.error();
        return null;
    }
    const projectData = await getCurrentProject();
    const projectIDCorruptedFixCommand = "```stackrail project ---switch <id | nickname>```";
    if (projectData === null) {
        spinner.error();
        return null;
    } else if (!(typeof projectData.id === 'number' && Number.isFinite(projectData.id))) {
        spinner.error({ text: chalk.red(`The ID for '${projectData.projectName}' has been corrupted use ${projectIDCorruptedFixCommand} to resolve.`) });
        return null;
    }

    return projectData;
}

export async function handleRail(taskTitle) {
    const spinner = startProjectMetadataSpinner();
    const projectData = await loadProjectMetadata(spinner);
    if (projectData === null) {
        // failed to load workspace metadata
        return;
    }
    // display the name of the current project
    stopProjectMetadataSpinner(spinner, projectData);

    const result = await db.insertRail(supabase, taskTitle, projectData.id);
    console.log(chalk.green(`'${taskTitle}' was successfully saved!`));
}

export async function handleAdd(argv) {
    const spinner = startProjectMetadataSpinner();
    const projectData = await loadProjectMetadata(spinner);
    if (projectData === null) {
        // failed to load workspace metadata
        return;
    }
    const userTags = await db.selectUserTags(supabase, projectData.id);
    if (userTags === null) {
        spinner.error({ text: chalk.red(`Failed to retrieve your tags for '${projectData.projectName}'`) });
        return;
    }
    // prepare the tags by putting them into a single array
    const projectTags = []
    for (let i = 0; i < DEFAULT_TAGS.length; i++) {
        projectTags.push(DEFAULT_TAGS[i]);
    }
    for (let i = 0; i < userTags.length; i++) {
        if (!projectTags.includes(userTags[i].tag)) {
            // only add user custom tags
            projectTags.push(userTags[i].tag);
        }
    }
    // display the name of the current project
    stopProjectMetadataSpinner(spinner, projectData);
    if (argv.rail) {
        const railId = argv.rail.trim();
        let column = null;
        if (UUID_REGEX.test(railId)) {
            column = 'id';
        } else {
            column = 'title';
        }
        const result = await db.selectRailBy(supabase, projectData.id, column, railId);
        if (result === null) {
            spinner.error({ text: chalk.red(`Failed to retrieve the rail task with the ${column} '${railId}'`) });
            return;
        } else if (result.length === 0) {
            spinner.error({ text: chalk.red(`No such rail task exists with the ${column}, '${railId}'`) });
            return;
        }
        const rail = result[0];
        const questions = getTaskQuestions(projectTags);
        questions.shift();  // remove the first question for the "title"
        //display the task's title
        console.log(chalk.green("✔"), "Task title:", chalk.cyan(rail.title));
        const taskInfo = await getTaskDetails(questions, false);
        taskInfo.title = rail.title;
        const additionStatus = await saveNewTask(taskInfo, projectData, 'Moving rail task', 'was successfully moved and saved as a stack task!');
        if (additionStatus) {
            await db.deleteRail(supabase, rail.id);
        }
    } else if (argv.bug) {
        // addition of a stack task that has been marked as a 'bug'
        const taskInfo = await getTaskDetails(getTaskQuestions(projectTags), true);
        await saveNewTask(taskInfo, projectData, 'Saving task', 'was successfully saved!');
    } else {
        // normal addition of a stack task
        const taskInfo = await getTaskDetails(getTaskQuestions(projectTags), false);
        await saveNewTask(taskInfo, projectData, 'Saving task', 'was successfully saved!');
    }
}

async function saveNewTask(taskInfo, projectData, savingMessage, successMessage) {
    console.log("");  // add empty line before the spinner
    const spinner = createSpinner(`${savingMessage} '${taskInfo.title}'`).start();
    const result = await db.insertStack(supabase, projectData.id, taskInfo.title,
        taskInfo.description, taskInfo.complexity, taskInfo.usersAffected, taskInfo.retention,
        taskInfo.conversion, taskInfo.confidence, taskInfo.selectedTags);
    if (result) {
        spinner.success({ text: chalk.green(`'${taskInfo.title}' ${successMessage}`) });
        return true;
    } else {
        spinner.stop()
        console.log(chalk.yellow(`'${taskInfo.title}' was saved but without tags due to an error...`));
        return false;
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
    const spinner = startProjectMetadataSpinner();
    const projectData = await loadProjectMetadata(spinner);
    if (projectData === null) {
        // failed to load workspace metadata
        return;
    }
    // display the name of the current project
    stopProjectMetadataSpinner(spinner, projectData);
    if (argv.all) {
        console.log('Listing all stackrail items.');
        // await listStackrailsAll();
    } else if (argv.rail) {
        const allProjectRails = await db.selectProjectRails(supabase, projectData.id);
        const rails = [];
        allProjectRails.forEach(rail => {
            rails.push([
                rail.id,
                new Date(rail.created_at).toLocaleDateString(),
                rail.title
            ]);
        });
        displayTable(['ID', 'Created', 'Title'], rails, 'rails');
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