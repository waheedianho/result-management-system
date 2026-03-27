const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGODB_URI;
const BACKUP_DIR = path.resolve(__dirname, '../backups');

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

const date = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const backupPath = path.join(BACKUP_DIR, `backup-${date}`);

console.log(`Starting backup to ${backupPath}...`);

// Use mongodump to backup the entire database
// For multi-tenancy, we are backing up the whole logical DB.
// Restoring a single tenant would require filtering the BSON files or restoring to a temp DB and filtering there.
const command = `mongodump --uri="${DB_URI}" --out="${backupPath}"`;

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`Backup failed: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`mongodump stderr: ${stderr}`);
    }
    console.log(`Backup completed successfully at ${backupPath}`);
});
