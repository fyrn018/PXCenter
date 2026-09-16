import fs from 'node:fs';
import path from 'node:path';
import JavaScriptObfuscator from 'javascript-obfuscator';

const rootDir = process.cwd();
const sourceFile = path.join(rootDir, 'docs', 'index.bak');
const targetFile = path.join(rootDir, 'index.js');

if (!fs.existsSync(sourceFile)) {
  console.error(`Error: Source file not found at ${sourceFile}`);
  process.exit(1);
}

console.log('Reading docs/index.bak...');
let sourceCode = fs.readFileSync(sourceFile, 'utf8');

// 移除可能存在的顶部 shebang 避免混淆语法报错
sourceCode = sourceCode.replace(/^#!.*\n/, '');

console.log('Obfuscating code for Node.js environment...');
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

const originalSize = (fs.statSync(sourceFile).size / 1024).toFixed(1);
const finalSize = (Buffer.byteLength(finalOutput, 'utf8') / 1024).toFixed(1);
console.log(`✓ Successfully obfuscated docs/index.bak (${originalSize} KB) -> index.js (${finalSize} KB)`);
