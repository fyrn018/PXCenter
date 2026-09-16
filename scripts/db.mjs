import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const action = process.argv[2];
const rootDir = process.cwd();
const dbFile = path.join(rootDir, 'docs', 'index.db');
const devFile = path.join(rootDir, 'docs', 'index.dev.js');

const secret = process.env.DB_KEY || 'pxcenter-rhine-archive-secret-2026';
const key = crypto.createHash('sha256').update(secret).digest();

if (action === 'decrypt') {
  if (!fs.existsSync(dbFile)) {
    console.error(`Error: ${dbFile} not found.`);
    process.exit(1);
  }
  const encrypted = fs.readFileSync(dbFile);
  const iv = encrypted.subarray(0, 16);
  const data = encrypted.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  fs.writeFileSync(devFile, plain);
  console.log(`✓ Decrypted docs/index.db -> docs/index.dev.js (${(plain.length / 1024).toFixed(1)} KB)`);
} else if (action === 'encrypt') {
  const inputFile = fs.existsSync(devFile) ? devFile : path.join(rootDir, 'docs', 'index.bak');
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Neither docs/index.dev.js nor docs/index.bak found to encrypt.`);
    process.exit(1);
  }
  const plain = fs.readFileSync(inputFile);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([iv, cipher.update(plain), cipher.final()]);
  fs.writeFileSync(dbFile, encrypted);
  console.log(`✓ Encrypted ${path.relative(rootDir, inputFile)} -> docs/index.db (${(encrypted.length / 1024).toFixed(1)} KB)`);
} else {
  console.log('Usage: node scripts/db.mjs [decrypt|encrypt]');
}
