import { homedir } from 'node:os';
import { join } from 'node:path';

export const SCOPES = [
  'https://www.googleapis.com/auth/tagmanager.readonly',
  'https://www.googleapis.com/auth/tagmanager.edit.containers',
  'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
  'https://www.googleapis.com/auth/tagmanager.publish',
  'https://www.googleapis.com/auth/tagmanager.delete.containers',
  'https://www.googleapis.com/auth/tagmanager.manage.users',
  'https://www.googleapis.com/auth/tagmanager.manage.accounts',
];

export const CONFIG_DIR = join(homedir(), '.genius-gtm-mcp');
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json');