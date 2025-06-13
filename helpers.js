// Use 'node:fs/promises' for Promise-based API
import * as fs from 'node:fs/promises';

import chalk from 'chalk'
import chalkAnimation from 'chalk-animation'
import figlet from 'figlet'

export async function displayCommandHeader(processMessage, actionPrompt) {
    console.log(chalk.cyan(processMessage));
    if (actionPrompt !== null) {
        console.log(chalk.gray(actionPrompt + '\n'));
    }
}

export async function displayStackRail() {
    figlet('StackRail', function (err, data) {
        if (err) {
            return;
        }

        const rainbow = chalkAnimation.rainbow(data);

        rainbow.start(); // Starts the animation
        // You might want to stop it after some time
        setTimeout(() => {
            rainbow.stop();
        }, 3000); // Stop after 3 seconds
    });
}

export async function displaySuccessMessage(message) {
    console.log(chalk.green(message));
}


export async function createDirectory(directoryPath) {
    try {
        await fs.mkdir(directoryPath, { recursive: true });
        return true;
    } catch (error) {
        // Handle errors, particularly if the directory already exists
        if (error.code === 'EEXIST') {
            // existence will be taken as the directory exists
            return true;
        } else {
            return false;
        }
    }
}

export async function directoryExists(directoryPath) {
    try {
        const stats = await fs.stat(directoryPath);
        return stats.isDirectory(); // Returns true if it's a directory, false if it's a file
    } catch (error) {
        if (error.code === 'ENOENT') {
            // 'ENOENT' means 'Error No Entry' - file or directory does not exist
            return false;
        }
        // For other errors (e.g., permissions), re-throw or handle as needed
        console.error(`Error checking directory '${directoryPath}':`, error.message);
        throw error; // Or return false, depending on desired error handling
    }
}

export async function fileExists(filePath) {
    try {
        // fs.promises.access() resolves if the file exists and is accessible
        // fs.constants.F_OK checks if the file is visible to the calling process
        const stats = await fs.stat(filePath);
        return stats.isFile();
    } catch (error) {
        // If fs.access() throws an error, it means the file does not exist
        // or there's a permission issue.
        if (error.code === 'ENOENT') {
            return false;
        } else {
            console.error(`Error checking file ${filePath}: ${error.message}`);
            // For other errors (e.g., EACCES - permission denied), you might
            // want to re-throw or handle them differently depending on your needs.
            throw error;
        }
    }
}

export async function deleteFile(filePath) {
    try {
        await fs.unlink(filePath);
        return true;
    } catch (error) {
        return false;
    }
}
