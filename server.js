#!/usr/bin/env node

/**
 * Genius GTM MCP — stdio server
 * Built by Hedayetul Islam Hadi
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import { readFileSync } from 'node:fs';
import { CONFIG_FILE } from './oauth-config.js';

let saved = {};
try {
  saved = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
} catch {}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || saved.client_id;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || saved.client_secret;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || saved.refresh_token;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error(
    'Genius GTM MCP — not configured yet.\n\n' +
    'First-time setup: open a terminal and run\n' +
    '    npx -y genius-gtm-mcp auth\n'
  );
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
oauth2.setCredentials({ refresh_token: REFRESH_TOKEN });
const tm = google.tagmanager({ version: 'v2', auth: oauth2 });

function ok(data) {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: 'text', text }] };
}

function bad(err) {
  return { isError: true, content: [{ type: 'text', text: 'API Error:\n' + String(err) }] };
}

// আমরা আপাতত ৩টি প্রধান টুলস দিচ্ছি (Accounts, Containers, Workspaces)। 
// আপনি চাইলে পরে was-gtm-mcp এর মতো বাকি টুলগুলোও একইভাবে এখানে অ্যাড করতে পারবেন।
const tools = [
  { name: 'gtm_account', description: 'List or get GTM accounts.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get'] }, accountId: { type: 'string' } }, required: ['action'] } },
  { name: 'gtm_container', description: 'Manage containers.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get'] }, accountId: { type: 'string' }, containerId: { type: 'string' } }, required: ['action','accountId'] } },
  { name: 'gtm_workspace', description: 'Manage workspaces.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, workspaceId: { type: 'string' } }, required: ['action','accountId','containerId'] } }
];

async function handleCall(name, a) {
  switch (name) {
    case 'gtm_account':
      if (a.action === 'list') return ok((await tm.accounts.list({})).data);
      if (a.action === 'get')  return ok((await tm.accounts.get({ path: `accounts/${a.accountId}` })).data);
      break;
    case 'gtm_container':
      if (a.action === 'list') return ok((await tm.accounts.containers.list({ parent: `accounts/${a.accountId}` })).data);
      break;
    case 'gtm_workspace':
      if (a.action === 'list') return ok((await tm.accounts.containers.workspaces.list({ parent: `accounts/${a.accountId}/containers/${a.containerId}` })).data);
      break;
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const server = new Server({ name: 'genius-gtm-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try { return await handleCall(req.params.name, req.params.arguments || {}); } catch (err) { return bad(err); }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Genius GTM MCP v1.0.0 ready — ${tools.length} tools loaded`);