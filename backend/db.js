import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Railway expose les variables du service MySQL sous les noms MYSQL*.
// On les remappe sur DB_* pour que le reste du code reste agnostique du provider.
if (!process.env.DB_HOST && process.env.MYSQLHOST) {
    process.env.DB_HOST = process.env.MYSQLHOST;
    process.env.DB_PORT = process.env.MYSQLPORT;
    process.env.DB_NAME = process.env.MYSQLDATABASE;
    process.env.DB_USER = process.env.MYSQLUSER;
    process.env.DB_PASSWORD = process.env.MYSQLPASSWORD;
}

// Determine credentials based on the operating system
const isLinux = os.platform() === 'linux';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: isLinux ? process.env.DB_USER : 'root',
    password: isLinux ? process.env.DB_PASSWORD : '',
});

export default pool;
