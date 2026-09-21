// Administrative recovery, run in the server/container with access to DATA_DIR.
// Usage: RESET_EMAIL=user@example.com RESET_PASSWORD='a-new-strong-password' node manage-user.js
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync} from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const email=process.env.RESET_EMAIL?.trim().toLowerCase(),pass=process.env.RESET_PASSWORD;
if(!email||!pass||pass.length<12||pass.length>128)throw new Error('Set RESET_EMAIL and RESET_PASSWORD (12–128 characters).');
const root=path.dirname(fileURLToPath(import.meta.url)),file=path.join(process.env.DATA_DIR||path.join(root,'data'),'velorie.sqlite');
if(!fs.existsSync(file))throw new Error('Database does not exist. Check DATA_DIR.');
const db=new DatabaseSync(file);const row=db.prepare('SELECT id FROM users WHERE email=?').get(email);if(!row)throw new Error('User not found.');
const salt=randomBytes(16).toString('hex'),password=salt+':'+scryptSync(pass,salt,64).toString('hex');
db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE users SET password=? WHERE id=?').run(password,row.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}db.close();console.log('Password changed. Existing sessions revoked.');
