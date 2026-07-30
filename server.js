#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import { readFileSync } from 'node:fs';
import { CONFIG_FILE } from './oauth-config.js';

let saved = {};
try { saved = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')); } catch {}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || saved.client_id;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || saved.client_secret;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || saved.refresh_token;

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || saved.cf_account_id;
const CF_API_TOKEN = process.env.CF_API_TOKEN || saved.cf_api_token;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error('Genius GTM MCP — not configured yet. Run npx -y genius-gtm-mcp auth');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
oauth2.setCredentials({ refresh_token: REFRESH_TOKEN });
const tm = google.tagmanager({ version: 'v2', auth: oauth2 });

const unwrap = (r) => r?.data ?? r;
function ok(data) {
  return { content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] };
}
function bad(err) {
  return { isError: true, content: [{ type: 'text', text: 'Error:\n' + (err?.message || String(err)) }] };
}

// ─── টুল লিস্ট (GTM + Cloudflare DNS & Workers) ──────────────────────────────
const tools = [
  { name: 'gtm_account', description: 'Manage GTM accounts', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get'] }, accountId: { type: 'string' } }, required: ['action'] } },
  { name: 'gtm_container', description: 'Manage containers', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','create'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, payload: { type: 'object' } }, required: ['action','accountId'] } },
  
  // ক্লাউডফ্লেয়ার জোন লুকআপ টুল
  { 
    name: 'cloudflare_zone_lookup', 
    description: 'Find Cloudflare Zone ID automatically using your domain name.', 
    inputSchema: { type: 'object', properties: { domainName: { type: 'string', description: 'e.g. example.com' } }, required: ['domainName'] } 
  },
  // DNS রেকর্ড ম্যানেজমেন্ট টুল (স্ট্যাপ বা ডোমেইন ভেরিফিকেশনের জন্য)
  { 
    name: 'cloudflare_dns_manager', 
    description: 'Add, list or delete DNS records (TXT, CNAME, etc.) in Cloudflare for domain verification or Stape.', 
    inputSchema: { 
      type: 'object', 
      properties: { 
        action: { type: 'string', enum: ['list', 'create', 'delete'] },
        zoneId: { type: 'string' },
        recordId: { type: 'string' },
        type: { type: 'string', enum: ['TXT', 'CNAME', 'A'] },
        name: { type: 'string', description: 'Record name e.g. _stape or metrics' },
        content: { type: 'string', description: 'Record value/target' },
        proxied: { type: 'boolean', description: 'True for Orange Cloud (Same Origin), False for Grey cloud (DNS only)' }
      }, 
      required: ['action', 'zoneId'] 
    } 
  },
  // সেইম অরিজিন সেটআপের জন্য Worker ডেপ্লয় টুল
  { 
    name: 'cloudflare_worker_deploy', 
    description: 'Deploy or update a Cloudflare Worker script for Same-Origin server-side tracking proxy.', 
    inputSchema: { 
      type: 'object', 
      properties: { 
        workerName: { type: 'string' },
        scriptContent: { type: 'string' }
      }, 
      required: ['workerName', 'scriptContent'] 
    } 
  }
];

// ─── হ্যান্ডলার লজিক ────────────────────────────────────────────────────────────
async function handleCall(name, a) {
  switch (name) {
    case 'gtm_account':
      return ok(unwrap(await tm.accounts.list({})));
      
    case 'gtm_container':
      return ok(unwrap(await tm.accounts.containers.list({ parent: `accounts/${a.accountId}` })));

    case 'cloudflare_zone_lookup': {
      if (!CF_API_TOKEN) throw new Error('Cloudflare API Token missing! Run "node cli.js cf-auth" first.');
      const res = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${a.domainName}`, {
        headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!data.success || data.result.length === 0) throw new Error('Zone not found for ' + a.domainName);
      return ok({ message: `Found Zone ID for ${a.domainName}`, zone_id: data.result[0].id });
    }

    case 'cloudflare_dns_manager': {
      if (!CF_API_TOKEN) throw new Error('Cloudflare API Token missing! Run "node cli.js cf-auth" first.');
      const base = `https://api.cloudflare.com/client/v4/zones/${a.zoneId}/dns_records`;
      
      if (a.action === 'list') {
        const res = await fetch(base, { headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` } });
        return ok(await res.json());
      }
      if (a.action === 'create') {
        const res = await fetch(base, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: a.type, name: a.name, content: a.content, proxied: a.proxied ?? false, ttl: 3600 })
        });
        return ok(await res.json());
      }
      throw new Error('Invalid action');
    }

    case 'cloudflare_worker_deploy': {
      if (!CF_ACCOUNT_ID || !CF_API_TOKEN) throw new Error('Cloudflare credentials missing!');
      const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts/${a.workerName}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/javascript' },
        body: a.scriptContent
      });
      const data = await res.json();
      if (!data.success) throw new Error('Cloudflare Error: ' + JSON.stringify(data.errors));
      return ok({ message: `Successfully deployed worker ${a.workerName} to Cloudflare!`, status: 'LIVE' });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const server = new Server({ name: 'genius-gtm-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try { return await handleCall(req.params.name, req.params.arguments || {}); } 
  catch (err) { return bad(err); }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Genius GTM MCP ready with ${tools.length} tools`);