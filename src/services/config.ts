import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import type { AppConfig } from '../types/config.js';
import { logError } from '../utils/logger/index.js';

const COMPONENT = 'ConfigService';

export async function readConfig(): Promise<AppConfig> {
  try {
    const configFile = await readFile('./config.yaml', 'utf8');
    return parse(configFile) as AppConfig;
  } catch (error) {
    logError(COMPONENT, 'Error reading configuration', error);
    throw new Error('Failed to load configuration');
  }
}
