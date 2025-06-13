// to get package.json
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// Supebase API object
import { createClient } from '@supabase/supabase-js'
// to get Supebase API credentials
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));

export const STACKRAIL_VERSION = packageJson.version;

export const STACKRAIL_SUPEBASE_URL = process.env.SUPABASE_URL;
export const STACKRAIL_SUPEBASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
export const supabase = createClient(STACKRAIL_SUPEBASE_URL, STACKRAIL_SUPEBASE_ANON_KEY)
export const SESSION_FILE_DIR = join(process.env.HOME || process.env.USERPROFILE, '.stackrail');
export const SESSION_FILE_PATH = join(SESSION_FILE_DIR, '.session.json');
export const PROFILE_FILE_PATH = join(SESSION_FILE_DIR, '.profile.json');
export const PROJECT_FILE_PATH = join(SESSION_FILE_DIR, '.project.json');
