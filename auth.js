import { supabase, SESSION_FILE_DIR, SESSION_FILE_PATH, PROFILE_FILE_PATH } from './config.js'
import { displayCommandHeader, displayStackRail, directoryExists, createDirectory, deleteFile } from './helpers.js'
import * as fs from 'node:fs/promises';

import chalk from 'chalk'
import inquirer from 'inquirer'

// Create a single supabase client for interacting with your database
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9]+$/;

async function getCredentials() {
        const questions = [
        {
            type: 'input', // Text input for email
            name: 'email',
            message: 'Enter your email:',
            validate: (input) => {
                // Basic email validation regex
                if (emailRegex.test(input)) {
                    return true;
                }
                return 'Please enter a valid email address.';
            },
        },
        {
            type: 'password', // Special type to hide the input characters
            name: 'password',
            message: 'Enter your password:',
            mask: '*', // specifies the character to show instead of real characters
            validate: (input) => {
                if (input.length >= 8) { // Minimum password length check
                    return true;
                }
                return 'Password must be at least 8 characters long.';
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

async function getNewProfileInfo() {
    const questions = [
        {
            type: 'input',
            name: 'firstName',
            message: 'Enter your first name:',
            validate: (input) => {
                if (input.length >= 1) {
                    return true;
                }
                return 'Please enter a valid first name.';
            },
        },
        {
            type: 'input',
            name: 'surname',
            message: 'Enter your surname:',
            validate: (input) => {
                if (input.length >= 1) {
                    return true;
                }
                return 'Please enter a valid surname.';
            },
        },
        {
            type: 'input',
            name: 'username',
            message: 'Enter a username:',
            validate: (input) => {
                if (input.length >= 1 && usernameRegex.test(input)) {
                    return true;
                }
                return 'Please enter a valid surname.';
            },
        },
        {
            type: 'input', // Text input for email
            name: 'email',
            message: 'Enter your email:',
            validate: (input) => {
                // Basic email validation regex
                if (emailRegex.test(input)) {
                    return true;
                }
                return 'Please enter a valid email address.';
            },
        },
        {
            type: 'password', // Special type to hide the input characters
            name: 'password',
            message: 'Enter your password:',
            mask: '*', // specifies the character to show instead of real characters
            validate: (input) => {
                if (input.length >= 8) { // Minimum password length check
                    return true;
                }
                return 'Password must be at least 8 characters long.';
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

export async function stackRailJoin() {
    await displayCommandHeader('--- Initiating Stackrail Sign Up Process ---', 'Please enter your details to create a new account.');
    const credentials = await getNewProfileInfo();
    try {
        const { data, error } = await supabase.auth.signUp({
            email: credentials.email,
            password: credentials.password
        })

        if (error) {
            throw error;
        }

        const sessionDirectoryFound = await directoryExists(SESSION_FILE_DIR);
        if (!sessionDirectoryFound) {
            createDirectory(SESSION_FILE_DIR);
        }

        const profileData = {
            firstName: credentials.firstName,
            surname: credentials.surname,
            username: credentials.username,
        };

        await fs.writeFile(PROFILE_FILE_PATH, JSON.stringify(profileData, null, 2));

        console.log(chalk.green('\nYour profile information was successfully saved.'));
        console.log(chalk.gray('Use the command ```stackrail verify``` to enter the OTP that was sent to your email to complete the account creation process.'));
    } catch (error) {
        console.error('Sign-up error:', error.message);
    }
}

async function getOtpDetails() {
    const questions = [
        {
            type: 'input',
            name: 'email',
            message: 'Enter your email address:',
            validate: (input) => {
                if (emailRegex.test(input)) {
                    return true;
                }
                return 'Please enter a valid email address.';
            },
        },
        {
            type: 'input',
            name: 'code',
            message: 'Enter the 6-digit OTP code:',
            validate: (input) => {
                if (/^\d{6}$/.test(input)) { // Simple check for 6 digits
                    return true;
                }
                return 'Please enter a a valid 6-digit code.';
            },
        },
    ]
    const answers = await inquirer.prompt(questions);
    return answers;
}

export async function stackRailVerification() {
    await displayCommandHeader('--- Completing account verification ---', 'Please enter your email and the provided OTP.');
    const optDetails = await getOtpDetails(); // Get email and code from user
    const { data, error } = await supabase.auth.verifyOtp({
        email: optDetails.email,
        token: optDetails.code,
        type: 'email', // Specify 'email' for email OTPs
    });
    if (error) {
        throw error;
    }
    if (data.session) {
        const profileData = await loadProfile();
        const { error } = await supabase
            .from('profile')
            .insert({
                first_name: profileData.firstName,
                surname: profileData.surname,
                username: profileData.username,
                email: optDetails.email
            })

        if (error) {
            throw error;
        }

        // delete the profile information file
        await fs.unlink(PROFILE_FILE_PATH);

        console.log(chalk.green('\nYou have successfully joined StackRail!'));
        console.log(chalk.gray('Proceed to login ```stackrail login```'));
    } else {
        console.log(chalk.red('\nFailed to verify your StackRail!'));
    }
}

export async function stackRailLogin() {
    await displayCommandHeader('--- Initiating Stackrail Login Process ---', 'Please enter your account details.');
    const credentials = await getCredentials();
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
        });

        if (error) {
            throw error;
        }

        // save the session to local storage
        await saveSession(data.session);
        console.log(chalk.green('\nLogin successful...\n'));
        await displayStackRail();
    } catch (error) {
        console.error('Sign-in error:', error.message);
    }
}

export async function stackRailLogout() {
    console.log('Handler: Initiating stackrail logout process...');
    await displayCommandHeader('--- Initiating Stackrail Logout Process ---', null);
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Sign-out error:', error.message);
        } else {
            await clearSession();
            console.log(chalk.green('\nYou have been successfully logged out...\n'));
        }
    } catch (error) {
        console.error('Sign-out error:', error.message);
    }
}

export async function checkUserSession() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error('Error getting session:', error.message);
        return null;
    }

    if (session) {
        return true;
    } else {
        return false;
    }
}

async function saveSession(session) {
    try {
        // if check if the .stackrail profile directory exists, if it doesn't
        // then create it first before create the session file
        const sessionDirectoryFound = await directoryExists(SESSION_FILE_DIR);
        if (!sessionDirectoryFound) {
            await createDirectory(SESSION_FILE_DIR);
        }
        await fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

async function loadSession() {
    try {
        const data = await fs.readFile(SESSION_FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
}

async function loadProfile() {
    try {
        const data = await fs.readFile(PROFILE_FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
}

async function clearSession() {
    try {
        await fs.unlink(SESSION_FILE_PATH);
        return true;
    } catch (error) {
        // Ignore if file doesn't exist
        if (error.code !== 'ENOENT') {
            return false;
        }
    }
}

export async function authenticateSession(supabaseObj) {
    const savedSession = await loadSession();

    if (savedSession) {
        try {
            // Set the loaded session on the Supabase client.
            // Supabase will automatically try to refresh the access token if needed.
            const { data, error } = await supabaseObj.auth.setSession(savedSession);

            if (error) {
                // This error means the refresh token itself is expired or invalid.
                // The user needs to log in again.
                await deleteFile(); // Clean up the invalid session file
                console.warn(chalk.yellow('Saved session is invalid or expired. Please login: ```stackrail login```'));
                return false;
            }

            if (data.session) {
                // If the session was refreshed, save the new session to keep it up-to-date
                if (data.session.access_token !== savedSession.access_token) {
                    await saveSession(data.session);
                }
                return true; // Authentication successful
            } else {
                // Should not happen if no error, but good for robustness
                await deleteFile();
                console.warn(chalk.yellow('Saved session is invalid or expired. Please login: ```stackrail login```'));
                return false;
            }
        } catch (error) {
            // Catch any unexpected errors during the setSession process
            await deleteFile();
            console.error(chalk.red('Unexpected error during session setup:'), error.message);
            return false;
        }
    } else {
        console.log(chalk.red('No saved session found. Please login: ```stackrail login```'));
        return false;
    }
}
