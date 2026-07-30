# Genius GTM MCP

Manage Google Tag Manager from Claude Desktop, Cursor, or any MCP-compatible client using natural language. 26 tools cover the full GTM v2 API, Cloudflare infrastructure, and Stape automation: accounts, containers, workspaces, tags, triggers, variables, templates, versions, environments, destinations, DNS records, proxy workers, and more.

100 percent local. Your credentials stay on your machine. Built by Hedayetul Islam Hadi — Genius Tracking. MIT licensed.

## Prerequisites

You need three things installed on your computer. All free, ~5 minutes total if you don't already have them.

| | Required for | How to install |
| :--- | :--- | :--- |
| **Node.js 18 or newer** | running `npx` | Mac: `brew install node` or download from https://nodejs.org · Windows: download installer from https://nodejs.org · Linux: `sudo apt install nodejs npm` |
| **Git** | letting `npx` clone the package from GitHub | Mac: `brew install git` (or just run `git --version` once and macOS will offer to install Xcode Command Line Tools) · Windows: download from https://git-scm.com · Linux: `sudo apt install git` |
| **A terminal** | running the commands below | Mac: open **Terminal.app** (Spotlight → "Terminal") · Windows: open **PowerShell** or **Windows Terminal** · Linux: any terminal emulator |

Quick verification — paste both commands in your terminal:

```bash
node --version   # should print v18.x or newer
git --version    # should print git version 2.x or newer
If either prints "command not found", install it using the link above before continuing.Quick start — 3 stepsStep 1 — Create your Google Cloud OAuth client (5 min, one-time)You use your own Google Cloud project for this. That way your API quota is your own, and no credentials are shared.Open https://console.cloud.google.com/apis/library/tagmanager.googleapis.com → click EnableOpen https://console.cloud.google.com/apis/credentials/consentUser type: External → CreateApp name: anything (e.g. "Genius GTM MCP")User support email: your emailDeveloper contact email: your email → SaveUnder Test users, click Add Users and add the Google account you'll sign in withOpen https://console.cloud.google.com/apis/credentialsCreate credentials → OAuth client IDApplication type: Desktop appName: anything → CreateCopy the Client ID and Client secret from the dialogStep 2 — Connect with one terminal commandBashnpx -y github:hedayetulislamhadi/genius-gtm-mcp auth
The tool will:Ask you to paste your Client ID and Client secretOpen your browser to Google sign-inAfter you click Allow, save everything to ~/.genius-gtm-mcp/config.json on your machineThat's it for setup. No more typing.Step 3 — Add 4 lines to Claude Desktop configOpen the config file:Mac: ~/Library/Application Support/Claude/claude_desktop_config.jsonWindows: %APPDATA%\Claude\claude_desktop_config.jsonPaste this block (merge with any existing mcpServers):JSON{
  "mcpServers": {
    "Genius GTM MCP": {
      "command": "npx",
      "args": ["-y", "github:hedayetulislamhadi/genius-gtm-mcp"]
    }
  }
}
No env block, no credentials in the config file. Everything is in ~/.genius-gtm-mcp/config.json.Fully quit Claude (Cmd+Q on Mac, fully exit on Windows) and reopen. In a new chat:"List my GTM accounts"Done.Useful commandsBashnpx -y github:hedayetulislamhadi/genius-gtm-mcp         # Start the MCP server (Claude Desktop calls this automatically)
npx -y github:hedayetulislamhadi/genius-gtm-mcp auth    # Connect / re-connect with Google
npx -y github:hedayetulislamhadi/genius-gtm-mcp logout  # Delete the saved credentials
npx -y github:hedayetulislamhadi/genius-gtm-mcp status  # Show whether credentials are saved
npx -y github:hedayetulislamhadi/genius-gtm-mcp help    # Usage
To switch to a different Google account, run logout then auth again.What you can ask Claude"List my GTM accounts""Show all containers in account 1234567""Create a workspace called 'experiment-A' in container GTM-XXXX""List all tags in workspace 1 of container GTM-XXXX""Show me the live version of container GTM-XXXX""Publish version 12 of container GTM-XXXX""Enable the Page URL and Click Element built-in variables in workspace 1""Create an sGTM container on Stape named 'Prod', add custom domain metrics.mystore.com, and add CNAME record to Cloudflare"All 26 toolsToolCoveragegtm_accountlist, get, updategtm_containerlist, get, create, update, delete, snippet, lookup, combine, move_tag_idgtm_workspacelist, get, create, update, delete, sync, get_status, quick_preview, resolve_conflictgtm_taglist, get, create, update, delete, revert (GA4, Ads, Stape sGTM, Floodlight, HTML, custom)gtm_triggerlist, get, create, update, delete, revertgtm_variablelist, get, create, update, delete, revertgtm_built_in_variablelist, enable, disable, revertgtm_folderlist, get, create, update, delete, revert, move_entities, entitiesgtm_clientsGTM clients — full CRUD + revertgtm_zonefull CRUD + revertgtm_templatecustom templates with .tpl supportgtm_transformationserver-container transformationsgtm_gtag_configGoogle tag configgtm_versionlist, get, live, publish, undelete, set_latest, create_from_workspacegtm_version_headerlist, latestgtm_environmentlist, get, create, update, delete, reauthorizegtm_destinationlist, get, linkgtm_user_permissionlist, get, create, update, deletegtm_rawuniversal escape hatch — call any tagmanager.v2.* method by dotted pathcloudflare_zone_lookupautomatically find Cloudflare Zone ID by domain namecloudflare_dns_manageradd, list, or delete DNS records (TXT, CNAME, A) for verificationcloudflare_worker_deploydeploy Same-Origin tracking proxy scripts to Cloudflare Workersstape_container_managercreate sGTM containers, check status, or delete containersstape_domain_manageradd custom domains and fetch DNS verification recordsgenius_datalayer_buildergenerate server-optimized GA4 e-commerce DataLayer snippetsgenius_capi_validatorvalidate Meta, TikTok & Snapchat server-side payload structures
