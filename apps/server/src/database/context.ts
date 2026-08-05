import fs from 'node:fs';
import { config } from '../config/config.js';
import { openDatabase } from './database.js';

fs.mkdirSync(config.filesDir, { recursive: true });
fs.mkdirSync(config.tempDir, { recursive: true });

export const database = openDatabase(config.databasePath);
