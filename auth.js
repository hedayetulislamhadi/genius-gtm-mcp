import { createServer } from 'node:http';
import { mkdir, writeFile, chmod, readFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { google } from 'googleapis';
import { SCOPES, CONFIG_DIR, CONFIG_FILE } from './oauth-config.js';

function openBrowser(url) {
  const cmds = {
    darwin: { cmd: 'open', args: [url] },
    linux: { cmd: 'xdg-open', args: [url] },
    win32: { cmd: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url] },
  };
  const c = cmds[process.platform];
  if (!c) {
    console.error(`Unsupported platform: ${process.platform}. Open this URL manually:\n${url}`);
    return;
  }
  try {
    const child = spawn(c.cmd, c.args, { detached: true, stdio: 'ignore' });
    child.unref();
  } catch (err) {
    console.error(`Couldn't auto-open browser. Open this URL manually:\n${url}`);
  }
}

const SUCCESS_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Genius GTM MCP — Connected</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:80px auto;padding:0 24px;color:#1a1a1a;line-height:1.6}
h1{font-size:24px;margin:0 0 16px}.box{background:#f3f7f4;border:1px solid #c8e0d2;border-radius:10px;padding:24px}
p{margin:0 0 12px}.ok{color:#0a7f3f;font-weight:600}</style></head>
<body><div class="box"><h1>Connected to Google Tag Manager</h1>
<p class="ok">Authorization successful.</p>
<p>Your credentials have been saved locally on your machine. You can close this tab and return to your terminal.</p>
</div></body></html>`;

const ERROR_HTML = (msg) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Genius GTM MCP — Error</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:80px auto;padding:0 24px;color:#1a1a1a;line-height:1.6}
h1{font-size:24px;margin:0 0 16px;color:#b03030}.box{background:#fdf2f2;border:1px solid #e8c4c4;border-radius:10px;padding:24px}</style></head>
<body><div class="box"><h1>Authorization failed</h1><p>${msg}</p><p>Return to the terminal and try again.</p></div></body></html>`;

export async function runAuthFlow() {
  console.log('\n=== Genius GTM MCP — Browser sign-in ===\n');

  let clientId = process.env.GOOGLE_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log('You need a Google Cloud OAuth client first.');
    const rl = readline.createInterface({ input, output });
    if (!clientId)     clientId     = (await rl.question('Paste your GOOGLE_CLIENT_ID: ')).trim();
    if (!clientSecret) clientSecret = (await rl.question('Paste your GOOGLE_CLIENT_SECRET: ')).trim();
    rl.close();
  }

  const state = randomBytes(16).toString('hex');
  let resolveCode, rejectCode;
  const codePromise = new Promise((res, rej) => { resolveCode = res; rejectCode = rej; });

  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    if (u.pathname !== '/callback') {
      res.writeHead(404); res.end('Not found'); return;
    }
    const returnedState = u.searchParams.get('state');
    const code = u.searchParams.get('code');
    const error = u.searchParams.get('error');
    
    if (error || returnedState !== state || !code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(ERROR_HTML(`Auth Error: ${error || 'Invalid State or Code'}`));
      rejectCode(new Error('Auth Failed'));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(SUCCESS_HTML);
    resolveCode(code);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const authUrl = oauth2.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES, state });

  console.log('\nOpening your browser to Google sign-in...');
  openBrowser(authUrl);

  let code;
  try {
    code = await Promise.race([
      codePromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out.')), 5 * 60 * 1000)),
    ]);
  } finally {
    server.close();
  }

  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) throw new Error('No refresh_token returned. Revoke access and try again.');

  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const payload = { client_id: clientId, client_secret: clientSecret, refresh_token: tokens.refresh_token, saved_at: new Date().toISOString() };
  await writeFile(CONFIG_FILE, JSON.stringify(payload, null, 2), { mode: 0o600 });
  try { await chmod(CONFIG_FILE, 0o600); } catch {}

  console.log(`\nSaved credentials to ${CONFIG_FILE}`);
}

export async function readConfigFile() {
  try { return JSON.parse(await readFile(CONFIG_FILE, 'utf8')); } catch (e) { return null; }
}

export async function deleteConfigFile() {
  try { await unlink(CONFIG_FILE); return true; } catch (e) { return false; }
}