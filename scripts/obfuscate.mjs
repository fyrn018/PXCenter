import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import JavaScriptObfuscator from 'javascript-obfuscator';

const rootDir = process.cwd();
const dbFile = path.join(rootDir, 'docs', 'index.db');
const targetFile = path.join(rootDir, 'index.js');

if (!fs.existsSync(dbFile)) {
  console.error(`Error: Encrypted database file not found at ${dbFile}`);
  process.exit(1);
}

// AES 解密密钥派生 (可通过环境变量 DB_KEY 自定义)
const secret = process.env.DB_KEY || 'pxcenter-rhine-archive-secret-2026';
const key = crypto.createHash('sha256').update(secret).digest();

console.log('Reading and decrypting docs/index.db (AES-256-CBC)...');
const encryptedBuffer = fs.readFileSync(dbFile);
if (encryptedBuffer.length < 17) {
  console.error('Error: docs/index.db is invalid or too small.');
  process.exit(1);
}

const iv = encryptedBuffer.subarray(0, 16);
const cipherData = encryptedBuffer.subarray(16);

let sourceCode;
try {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  sourceCode = Buffer.concat([decipher.update(cipherData), decipher.final()]).toString('utf8');
} catch (err) {
  console.error('Error: Failed to decrypt docs/index.db. Incorrect key or corrupted data.');
  process.exit(1);
}

// 移除顶部可能存在的 shebang 避免混淆语法报错
sourceCode = sourceCode.replace(/^#!.*\n/, '');

console.log('Obfuscating decrypted code for Node.js environment...');
const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, {
  target: 'node',
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  numbersToExpressions: true,
  simplify: true,
  stringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArrayThreshold: 0.8,
  splitStrings: true,
  splitStringsChunkLength: 5,
  transformObjectKeys: true,
  reservedNames: [
    'require', 'module', 'exports', '__dirname', '__filename',
    'process', 'Buffer', 'global', 'WebSocket'
  ]
});

// 顶部静态 tracing 声明，确保 Vercel / @vercel/nft 正确打包所有必要运行时依赖
const header = `#!/usr/bin/env node
require("systeminformation");
require("@grpc/grpc-js");
require("@grpc/proto-loader");
require("axios");
require("ws");\n\n`;

const finalOutput = header + obfuscationResult.getObfuscatedCode();
fs.writeFileSync(targetFile, finalOutput, 'utf8');

const dbSize = (encryptedBuffer.length / 1024).toFixed(1);
const finalSize = (Buffer.byteLength(finalOutput, 'utf8') / 1024).toFixed(1);
console.log(`✓ Successfully decrypted docs/index.db (${dbSize} KB) and obfuscated -> index.js (${finalSize} KB)`);
