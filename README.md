# Genius GTM MCP

Manage Google Tag Manager from Claude Desktop, Cursor, or any MCP-compatible client using natural language. 26 tools cover the full GTM v2 API, Cloudflare infrastructure, and Stape automation: accounts, containers, workspaces, tags, triggers, variables, templates, versions, environments, destinations, DNS records, proxy workers, and more.

100 percent local. Your credentials stay on your machine. Built by Hedayetul Islam Hadi — Genius Tracking. MIT licensed.

## Prerequisites

You need three things installed on your computer. All free, ~5 minutes total if you don't already have them.

| | Required for | How to install |
| :--- | :--- | :--- |
| **Node.js 18 or newer** | running `npx` | Mac: `brew install node` or download from https://nodejs.org · Windows: download installer from https://nodejs.org · Linux: `sudo apt install nodejs npm` |
| **Git** | letting `npx` clone the package from GitHub | Mac: `brew install git` (or just run `git --version` once and macOS will offer to install Xcode Command Line Tools) · Windows: download from https://git-scm.com · Linux: `sudo apt install git` |
| **A terminal** | running the commands below | Mac: open **Terminal.app** (Spotlight → "Terminal") | Windows: open **PowerShell** or **Windows Terminal** · Linux: any terminal emulator |

Quick verification — paste both commands in your terminal:

```bash
node --version   # should print v18.x or newer
git --version    # should print git version 2.x or newer


If either prints "command not found", install it using the link above before continuing.

Quick start — 3 steps
Step 1 — Create your Google Cloud OAuth client (5 min, one-time)
You use your own Google Cloud project for this. That way your API quota is your own, and no credentials are shared.

Open https://console.cloud.google.com/apis/library/tagmanager.googleapis.com → click Enable

Open https://console.cloud.google.com/apis/credentials/consent

User type: External → Create

App name: anything (e.g. "Genius GTM MCP")

User support email: your email

Developer contact email: your email → Save

Under Test users, click Add Users and add the Google account you'll sign in with

Open https://console.cloud.google.com/apis/credentials

Create credentials → OAuth client ID

Application type: Desktop app

Name: anything → Create

Copy the Client ID and Client secret from the dialog
