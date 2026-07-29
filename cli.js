#!/usr/bin/env node

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { CONFIG_FILE } from './oauth-config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cmd = (process.argv[2] || '').toLowerCase();

if (cmd === 'auth') {
  const { runAuthFlow } = await import(pathToFileURL(join(__dirname, 'auth.js')).href);
  try {
    await runAuthFlow();
    process.exit(0);
  } catch (err) {
    console.error('\nAuth failed:', err?.message || err);
    process.exit(1);
  }
} else if (cmd === 'cf-auth') {
  const readline = (await import('node:readline/promises')).default;
  const { stdin: input, stdout: output } = await import('node:process');
  const { readFile, writeFile } = await import('node:fs/promises');
  
  const rl = readline.createInterface({ input, output });
  console.log('\n=== Genius GTM MCP — Cloudflare Setup ===\n');
  const accountId = (await rl.question('Paste your Cloudflare Account ID: ')).trim();
  const apiToken = (await rl.question('Paste your Cloudflare API Token: ')).trim();
  rl.close();

  let saved = {};
  try { saved = JSON.parse(await readFile(CONFIG_FILE, 'utf8')); } catch {}
  
  saved.cf_account_id = accountId;
  saved.cf_api_token = apiToken;
  
  await writeFile(CONFIG_FILE, JSON.stringify(saved, null, 2), { mode: 0o600 });
  console.log(`\nCloudflare credentials saved successfully to ${CONFIG_FILE}!\n`);
  process.exit(0);
} else if (cmd === 'logout') {
  const { deleteConfigFile } = await import(pathToFileURL(join(__dirname, 'auth.js')).href);
  const deleted = await deleteConfigFile();
  console.log(deleted ? `Removed ${CONFIG_FILE}` : 'No saved credentials to remove.');
  process.exit(0);
} else if (cmd === 'status') {
  const { readConfigFile } = await import(pathToFileURL(join(__dirname, 'auth.js')).href);
  const cfg = await readConfigFile();
  if (!cfg) {
    console.log('Not configured. Run `npx -y genius-gtm-mcp auth` to connect.');
  } else {
    console.log(`Config: ${CONFIG_FILE}`);
    console.log(`Saved:  ${cfg.saved_at || '(unknown)'}`);
    console.log(`Client: ${cfg.client_id || '(unknown)'}`);
    console.log(`Cloudflare Account ID: ${cfg.cf_account_id || '(not set)'}`);
  }
  process.exit(0);
} else if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
  console.log(`
Genius GTM MCP server

Usage:
  genius-gtm-mcp            Start the MCP server
  genius-gtm-mcp auth       Connect with Google OAuth
  genius-gtm-mcp cf-auth    Connect with Cloudflare API
  genius-gtm-mcp logout     Delete saved credentials
  genius-gtm-mcp status     Show config status
`);
  process.exit(0);
} else if (!cmd) {
  await import(pathToFileURL(join(__dirname, 'server.js')).href);
} else {
  console.error(`Unknown command: "${cmd}"`);
  process.exit(1);
}