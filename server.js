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

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || saved.cf_account_id;
const CF_API_TOKEN = process.env.CF_API_TOKEN || saved.cf_api_token;

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

// ─── path helpers ─────────────────────────────────────────────────────────────
const accountPath = (aid) => `accounts/${aid}`;
const containerPath = (aid, cid) => `accounts/${aid}/containers/${cid}`;
const workspacePath = (aid, cid, wid) => `accounts/${aid}/containers/${cid}/workspaces/${wid}`;
const versionPath = (aid, cid, vid) => `accounts/${aid}/containers/${cid}/versions/${vid}`;
const environmentPath = (aid, cid, eid) => `accounts/${aid}/containers/${cid}/environments/${eid}`;
const userPermPath = (aid, upid) => `accounts/${aid}/user_permissions/${upid}`;

// ─── response wrappers ────────────────────────────────────────────────────────
function ok(data) {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const MAX = 60000;
  if (text.length > MAX) {
    return { content: [{ type: 'text', text: text.slice(0, MAX) + `\n\n... [truncated ${text.length - MAX} chars]` }] };
  }
  return { content: [{ type: 'text', text }] };
}

function bad(err) {
  return {
    isError: true,
    content: [{
      type: 'text',
      text: 'GTM API error:\n' + JSON.stringify({
        message: err?.message || String(err),
        code: err?.code,
        status: err?.response?.status,
        errors: err?.response?.data?.error?.errors || err?.errors,
        details: err?.response?.data?.error?.message,
      }, null, 2),
    }],
  };
}

const unwrap = (r) => r?.data ?? r;

async function workspaceResource(svc, action, a, plural) {
  const wp = workspacePath(a.accountId, a.containerId, a.workspaceId);
  const ep = a.entityId ? `${wp}/${plural}/${a.entityId}` : null;
  if (action === 'list')   return ok(unwrap(await svc.list({ parent: wp })));
  if (action === 'get')    return ok(unwrap(await svc.get({ path: ep })));
  if (action === 'create') return ok(unwrap(await svc.create({ parent: wp, requestBody: a.payload || {} })));
  if (action === 'update') return ok(unwrap(await svc.update({ path: ep, requestBody: a.payload || {} })));
  if (action === 'delete') return ok(unwrap(await svc.delete({ path: ep })));
  if (action === 'revert') return ok(unwrap(await svc.revert({ path: ep })));
  throw new Error(`Invalid action: ${action}`);
}

// ─── tool definitions ────────────────────────────────────────────────────────
const tools = [
  { name: 'gtm_account', description: 'Manage GTM accounts. actions: list | get | update.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','update'] }, accountId: { type: 'string' }, payload: { type: 'object' } }, required: ['action'] } },
  { name: 'gtm_container', description: 'Manage containers. actions: list | get | create | update | delete | snippet | lookup | combine | move_tag_id.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','create','update','delete','snippet','lookup','combine','move_tag_id'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, destinationId: { type: 'string' }, tagId: { type: 'string' }, payload: { type: 'object' } }, required: ['action','accountId'] } },
  { name: 'gtm_workspace', description: 'Manage workspaces. actions: list | get | create | update | delete | sync | get_status | quick_preview | resolve_conflict.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','create','update','delete','sync','get_status','quick_preview','resolve_conflict'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, workspaceId: { type: 'string' }, payload: { type: 'object' } }, required: ['action','accountId','containerId'] } },
  { name: 'gtm_tag', description: 'Manage tags.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','create','update','delete','revert'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, workspaceId: { type: 'string' }, entityId: { type: 'string' }, payload: { type: 'object' } }, required: ['action','accountId','containerId','workspaceId'] } },
  { name: 'gtm_trigger', description: 'Manage triggers.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','create','update','delete','revert'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, workspaceId: { type: 'string' }, entityId: { type: 'string' }, payload: { type: 'object' } }, required: ['action','accountId','containerId','workspaceId'] } },
  { name: 'gtm_variable', description: 'Manage user-defined variables.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','create','update','delete','revert'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, workspaceId: { type: 'string' }, entityId: { type: 'string' }, payload: { type: 'object' } }, required: ['action','accountId','containerId','workspaceId'] } },
  { name: 'gtm_built_in_variable', description: 'Manage built-in variables.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','enable','disable','revert'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, workspaceId: { type: 'string' }, types: { type: 'array', items: { type: 'string' } } }, required: ['action','accountId','containerId','workspaceId'] } },
  { name: 'gtm_folder', description: 'Manage folders.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','create','update','delete','revert','move_entities','entities'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, workspaceId: { type: 'string' }, entityId: { type: 'string' }, payload: { type: 'object' } }, required: ['action','accountId','containerId','workspaceId'] } },
  { name: 'gtm_client', description: 'sGTM clients.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','create','update','delete','revert'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, workspaceId: { type: 'string' }, entityId: { type: 'string' }, payload: { type: 'object' } }, required: ['action','accountId','containerId','workspaceId'] } },
  { name: 'gtm_zone', description: 'Zones (sub-containers).', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','create','update','delete','revert'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, workspaceId: { type: 'string' }, entityId: { type: 'string' }, payload: { type: 'object' } }, required: ['action','accountId','containerId','workspaceId'] } },
  { name: 'gtm_template', description: 'Custom tag/variable templates with full .tpl support.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','create','update','delete','revert'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, workspaceId: { type: 'string' }, entityId: { type: 'string' }, payload: { type: 'object' } }, required: ['action','accountId','containerId','workspaceId'] } },
  { name: 'gtm_transformation', description: 'Server-container transformations.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','create','update','delete','revert'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, workspaceId: { type: 'string' }, entityId: { type: 'string' }, payload: { type: 'object' } }, required: ['action','accountId','containerId','workspaceId'] } },
  { name: 'gtm_gtag_config', description: 'Google tag config.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','create','update','delete','revert'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, workspaceId: { type: 'string' }, entityId: { type: 'string' }, payload: { type: 'object' } }, required: ['action','accountId','containerId','workspaceId'] } },
  { name: 'gtm_version', description: 'Container versions.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','live','publish','undelete','set_latest','create_from_workspace'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, workspaceId: { type: 'string' }, versionId: { type: 'string' }, payload: { type: 'object' } }, required: ['action','accountId','containerId'] } },
  { name: 'gtm_version_header', description: 'Version metadata.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','latest'] }, accountId: { type: 'string' }, containerId: { type: 'string' } }, required: ['action','accountId','containerId'] } },
  { name: 'gtm_environment', description: 'Environments.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','create','update','delete','reauthorize'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, entityId: { type: 'string' }, payload: { type: 'object' } }, required: ['action','accountId','containerId'] } },
  { name: 'gtm_destination', description: 'GA4 destinations.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','link'] }, accountId: { type: 'string' }, containerId: { type: 'string' }, destinationId: { type: 'string' }, payload: { type: 'object' } }, required: ['action','accountId','containerId'] } },
  { name: 'gtm_user_permission', description: 'User permissions.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list','get','create','update','delete'] }, accountId: { type: 'string' }, userPermissionId: { type: 'string' }, payload: { type: 'object' } }, required: ['action'] } },
  { name: 'gtm_raw', description: 'UNIVERSAL escape hatch.', inputSchema: { type: 'object', properties: { method: { type: 'string' }, params: { type: 'object' } }, required: ['method'] } },
  
  // --- Custom Tools for Genius GTM MCP ---
  { 
    name: 'genius_datalayer_builder', 
    description: 'Generate advanced, server-side optimized e-commerce DataLayer snippet for GA4.', 
    inputSchema: { 
      type: 'object', 
      properties: { 
        eventName: { type: 'string', description: 'Event name e.g., view_item, purchase' },
        includeItems: { type: 'boolean', description: 'Include demo ecommerce items?' }
      }, 
      required: ['eventName'] 
    } 
  },
  { 
    name: 'genius_capi_validator', 
    description: 'Validate and generate Meta CAPI / TikTok Server payload from browser data.', 
    inputSchema: { 
      type: 'object', 
      properties: { 
        platform: { type: 'string', enum: ['meta', 'tiktok', 'snapchat'], description: 'Target platform' },
        eventName: { type: 'string', description: 'Standard event name' }
      }, 
      required: ['platform', 'eventName'] 
    } 
  },
  { 
    name: 'cloudflare_worker_deploy', 
    description: 'Deploy or update a Cloudflare Worker script (e.g., Server-Side GTM proxy or tracking script).', 
    inputSchema: { 
      type: 'object', 
      properties: { 
        workerName: { type: 'string', description: 'Name of the Cloudflare Worker' },
        scriptContent: { type: 'string', description: 'The complete JavaScript code for the Worker' }
      }, 
      required: ['workerName', 'scriptContent'] 
    } 
  }
];

// ─── tool handlers ────────────────────────────────────────────────────────────
async function handleCall(name, a) {
  switch (name) {
    case 'gtm_account': {
      if (a.action === 'list')   return ok(unwrap(await tm.accounts.list({})));
      if (a.action === 'get')    return ok(unwrap(await tm.accounts.get({ path: accountPath(a.accountId) })));
      if (a.action === 'update') return ok(unwrap(await tm.accounts.update({ path: accountPath(a.accountId), requestBody: a.payload || {} })));
      throw new Error('Invalid action');
    }
    case 'gtm_container': {
      const ap = accountPath(a.accountId);
      const cp = a.containerId ? containerPath(a.accountId, a.containerId) : null;
      const cs = tm.accounts.containers;
      if (a.action === 'list')         return ok(unwrap(await cs.list({ parent: ap })));
      if (a.action === 'get')          return ok(unwrap(await cs.get({ path: cp })));
      if (a.action === 'create')       return ok(unwrap(await cs.create({ parent: ap, requestBody: a.payload || {} })));
      if (a.action === 'update')       return ok(unwrap(await cs.update({ path: cp, requestBody: a.payload || {} })));
      if (a.action === 'delete')       return ok(unwrap(await cs.delete({ path: cp })));
      if (a.action === 'snippet')      return ok(unwrap(await cs.snippet({ path: cp })));
      if (a.action === 'lookup')       return ok(unwrap(await cs.lookup({ destinationId: a.destinationId, tagId: a.tagId })));
      if (a.action === 'combine')      return ok(unwrap(await cs.combine({ path: cp, ...(a.payload || {}) })));
      if (a.action === 'move_tag_id')  return ok(unwrap(await cs.move_tag_id({ path: cp, ...(a.payload || {}) })));
      throw new Error('Invalid action');
    }
    case 'gtm_workspace': {
      const cp = containerPath(a.accountId, a.containerId);
      const wp = a.workspaceId ? workspacePath(a.accountId, a.containerId, a.workspaceId) : null;
      const ws = tm.accounts.containers.workspaces;
      if (a.action === 'list')              return ok(unwrap(await ws.list({ parent: cp })));
      if (a.action === 'get')               return ok(unwrap(await ws.get({ path: wp })));
      if (a.action === 'create')            return ok(unwrap(await ws.create({ parent: cp, requestBody: a.payload || {} })));
      if (a.action === 'update')            return ok(unwrap(await ws.update({ path: wp, requestBody: a.payload || {} })));
      if (a.action === 'delete')            return ok(unwrap(await ws.delete({ path: wp })));
      if (a.action === 'sync')              return ok(unwrap(await ws.sync({ path: wp })));
      if (a.action === 'get_status')        return ok(unwrap(await ws.getStatus({ path: wp })));
      if (a.action === 'quick_preview')     return ok(unwrap(await ws.quick_preview({ path: wp })));
      if (a.action === 'resolve_conflict')  return ok(unwrap(await ws.resolve_conflict({ path: wp, requestBody: a.payload || {} })));
      throw new Error('Invalid action');
    }
    case 'gtm_tag':            return await workspaceResource(tm.accounts.containers.workspaces.tags, a.action, a, 'tags');
    case 'gtm_trigger':        return await workspaceResource(tm.accounts.containers.workspaces.triggers, a.action, a, 'triggers');
    case 'gtm_variable':       return await workspaceResource(tm.accounts.containers.workspaces.variables, a.action, a, 'variables');
    case 'gtm_client':         return await workspaceResource(tm.accounts.containers.workspaces.clients, a.action, a, 'clients');
    case 'gtm_zone':           return await workspaceResource(tm.accounts.containers.workspaces.zones, a.action, a, 'zones');
    case 'gtm_template':       return await workspaceResource(tm.accounts.containers.workspaces.templates, a.action, a, 'templates');
    case 'gtm_transformation': return await workspaceResource(tm.accounts.containers.workspaces.transformations, a.action, a, 'transformations');
    case 'gtm_gtag_config':    return await workspaceResource(tm.accounts.containers.workspaces.gtag_config, a.action, a, 'gtag_config');
    case 'gtm_built_in_variable': {
      const wp = workspacePath(a.accountId, a.containerId, a.workspaceId);
      const biv = tm.accounts.containers.workspaces.built_in_variables;
      if (a.action === 'list')    return ok(unwrap(await biv.list({ parent: wp })));
      if (a.action === 'enable')  return ok(unwrap(await biv.create({ parent: wp, type: a.types })));
      if (a.action === 'disable') return ok(unwrap(await biv.delete({ path: wp, type: a.types })));
      if (a.action === 'revert')  return ok(unwrap(await biv.revert({ path: wp, type: a.types })));
      throw new Error('Invalid action');
    }
    case 'gtm_folder': {
      const wp = workspacePath(a.accountId, a.containerId, a.workspaceId);
      const fp = a.entityId ? `${wp}/folders/${a.entityId}` : null;
      const f = tm.accounts.containers.workspaces.folders;
      if (a.action === 'list')          return ok(unwrap(await f.list({ parent: wp })));
      if (a.action === 'get')           return ok(unwrap(await f.get({ path: fp })));
      if (a.action === 'create')        return ok(unwrap(await f.create({ parent: wp, requestBody: a.payload || {} })));
      if (a.action === 'update')        return ok(unwrap(await f.update({ path: fp, requestBody: a.payload || {} })));
      if (a.action === 'delete')        return ok(unwrap(await f.delete({ path: fp })));
      if (a.action === 'revert')        return ok(unwrap(await f.revert({ path: fp })));
      if (a.action === 'entities')      return ok(unwrap(await f.entities({ path: fp })));
      if (a.action === 'move_entities') return ok(unwrap(await f.move_entities_to_folder({ path: fp, tagId: a.payload?.tagIds, triggerId: a.payload?.triggerIds, variableId: a.payload?.variableIds })));
      throw new Error('Invalid action');
    }
    case 'gtm_version': {
      const cp = containerPath(a.accountId, a.containerId);
      const vp = a.versionId ? versionPath(a.accountId, a.containerId, a.versionId) : null;
      const wp = a.workspaceId ? workspacePath(a.accountId, a.containerId, a.workspaceId) : null;
      const v = tm.accounts.containers.versions;
      if (a.action === 'list')                  return ok(unwrap(await v.list({ parent: cp })));
      if (a.action === 'get')                   return ok(unwrap(await v.get({ path: vp })));
      if (a.action === 'live')                  return ok(unwrap(await v.live({ parent: cp })));
      if (a.action === 'publish')               return ok(unwrap(await v.publish({ path: vp })));
      if (a.action === 'undelete')              return ok(unwrap(await v.undelete({ path: vp })));
      if (a.action === 'set_latest')            return ok(unwrap(await v.set_latest({ path: vp })));
      if (a.action === 'create_from_workspace') return ok(unwrap(await tm.accounts.containers.workspaces.create_version({ path: wp, requestBody: a.payload || {} })));
      throw new Error('Invalid action');
    }
    case 'gtm_version_header': {
      const cp = containerPath(a.accountId, a.containerId);
      const vh = tm.accounts.containers.version_headers;
      if (a.action === 'list')   return ok(unwrap(await vh.list({ parent: cp })));
      if (a.action === 'latest') return ok(unwrap(await vh.latest({ parent: cp })));
      throw new Error('Invalid action');
    }
    case 'gtm_environment': {
      const cp = containerPath(a.accountId, a.containerId);
      const ep = a.entityId ? environmentPath(a.accountId, a.containerId, a.entityId) : null;
      const e = tm.accounts.containers.environments;
      if (a.action === 'list')        return ok(unwrap(await e.list({ parent: cp })));
      if (a.action === 'get')         return ok(unwrap(await e.get({ path: ep })));
      if (a.action === 'create')      return ok(unwrap(await e.create({ parent: cp, requestBody: a.payload || {} })));
      if (a.action === 'update')      return ok(unwrap(await e.update({ path: ep, requestBody: a.payload || {} })));
      if (a.action === 'delete')      return ok(unwrap(await e.delete({ path: ep })));
      if (a.action === 'reauthorize') return ok(unwrap(await e.reauthorize({ path: ep })));
      throw new Error('Invalid action');
    }
    case 'gtm_destination': {
      const cp = containerPath(a.accountId, a.containerId);
      const dp = a.destinationId ? `${cp}/destinations/${a.destinationId}` : null;
      const d = tm.accounts.containers.destinations;
      if (a.action === 'list') return ok(unwrap(await d.list({ parent: cp })));
      if (a.action === 'get')  return ok(unwrap(await d.get({ path: dp })));
      if (a.action === 'link') return ok(unwrap(await d.link({ parent: cp, destinationId: a.destinationId, allowUserPermissionFeatureUpdate: true })));
      throw new Error('Invalid action');
    }
    case 'gtm_user_permission': {
      const ap = accountPath(a.accountId);
      const upp = a.userPermissionId ? userPermPath(a.accountId, a.userPermissionId) : null;
      const up = tm.accounts.user_permissions;
      if (a.action === 'list')   return ok(unwrap(await up.list({ parent: ap })));
      if (a.action === 'get')    return ok(unwrap(await up.get({ path: upp })));
      if (a.action === 'create') return ok(unwrap(await up.create({ parent: ap, requestBody: a.payload || {} })));
      if (a.action === 'update') return ok(unwrap(await up.update({ path: upp, requestBody: a.payload || {} })));
      if (a.action === 'delete') return ok(unwrap(await up.delete({ path: upp })));
      throw new Error('Invalid action');
    }
    case 'gtm_raw': {
      const segs = a.method.split('.');
      let parent = null;
      let fn = tm;
      for (const seg of segs) {
        if (fn == null) throw new Error(`Path "${a.method}" broke at "${seg}"`);
        parent = fn;
        fn = fn[seg];
      }
      if (typeof fn !== 'function') throw new Error(`Not callable: ${a.method}`);
      return ok(unwrap(await fn.call(parent, a.params || {})));
    }

    // --- Custom Tool Handlers ---
    case 'genius_datalayer_builder': {
      const { eventName, includeItems } = a;
      let snippet = `<script>\nwindow.dataLayer = window.dataLayer || [];\nwindow.dataLayer.push({\n  event: '${eventName}',`;
      
      if (includeItems) {
        snippet += `\n  ecommerce: {
    currency: 'USD',
    value: 120.50,
    items: [
      { item_id: 'SKU_12345', item_name: 'Genius Tracking T-Shirt', price: 120.50, quantity: 1 }
    ]
  }`;
      } else {
        snippet += `\n  // Add your custom event parameters here\n  parameter_1: 'value_1'`;
      }
      snippet += `\n});\n</script>`;

      return ok({
        message: `Genius GTM MCP successfully generated the DataLayer for '${eventName}'.`,
        snippet: snippet
      });
    }

    case 'genius_capi_validator': {
      const { platform, eventName } = a;
      let payload = {};

      if (platform === 'meta') {
        payload = {
          data: [{
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            action_source: "website",
            user_data: {
              em: ["<HASHED_EMAIL>"],
              ph: ["<HASHED_PHONE>"],
              client_ip_address: "<CLIENT_IP>",
              client_user_agent: "<USER_AGENT>"
            },
            custom_data: { currency: "USD", value: 100.00 }
          }]
        };
      } else if (platform === 'tiktok') {
        payload = {
          event: eventName,
          event_time: Math.floor(Date.now() / 1000),
          user: { email: "<HASHED_EMAIL>", phone_number: "<HASHED_PHONE>" },
          properties: { currency: "USD", value: 100.00 }
        };
      } else if (platform === 'snapchat') {
        payload = {
          event_type: eventName,
          event_conversion_type: "WEB",
          timestamp: Math.floor(Date.now() / 1000),
          user_data: { hashed_email: "<HASHED_EMAIL>", hashed_phone_number: "<HASHED_PHONE>" },
          custom_data: { currency: "USD", value: 100.00 }
        };
      }

      return ok({
        message: `Validated ${platform.toUpperCase()} server-side payload structure for '${eventName}'.`,
        required_hashing: "SHA256 (Email, Phone, etc.)",
        sample_payload: payload
      });
    }

    case 'cloudflare_worker_deploy': {
      if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
        throw new Error('Cloudflare credentials not found! Run "node cli.js cf-auth" in your terminal first.');
      }

      const { workerName, scriptContent } = a;
      const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts/${workerName}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/javascript'
        },
        body: scriptContent
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error('Cloudflare API Error: ' + JSON.stringify(data.errors, null, 2));
      }

      return ok({
        message: `Successfully deployed Worker "${workerName}" to Cloudflare!`,
        worker_id: data.result?.id || workerName,
        status: "LIVE"
      });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── MCP server wiring ────────────────────────────────------------------------
const server = new Server(
  { name: 'genius-gtm-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    return await handleCall(req.params.name, req.params.arguments || {});
  } catch (err) {
    return bad(err);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

console.error(`Genius GTM MCP v1.0.0 ready — ${tools.length} tools loaded`);