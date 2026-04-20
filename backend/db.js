import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Determine credentials based on the operating system
const isLinux = os.platform() === 'linux';

// Debug — dump des variables d'env BDD au démarrage (sans exposer le password)
console.log('[DB DEBUG]', {
    DB_HOST: process.env.DB_HOST || '(undefined)',
    DB_PORT: process.env.DB_PORT || '(undefined)',
    DB_NAME: process.env.DB_NAME || '(undefined)',
    DB_USER: process.env.DB_USER || '(undefined)',
    DB_PASSWORD_length: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0,
    NODE_ENV: process.env.NODE_ENV || '(undefined)',
});

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: isLinux ? process.env.DB_USER : 'root',
    password: isLinux ? process.env.DB_PASSWORD : '',
});

export default pool;
