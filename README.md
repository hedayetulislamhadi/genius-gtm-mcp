\# 🚀 Genius GTM MCP — Ultimate Server-Side Tracking Master Suite



!\[Version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge)

!\[License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)

!\[Node](https://img.shields.io/badge/node->=18.0.0-orange.svg?style=for-the-badge)

!\[Platform](https://img.shields.io/badge/platform-GTM%20|%20Cloudflare%20|%20Stape.io-purple.svg?style=for-the-badge)



\*\*Genius GTM MCP\*\* is an all-in-one Model Context Protocol (MCP) server that connects AI assistants (like Claude Desktop) directly with \*\*Google Tag Manager (GTM)\*\*, \*\*Cloudflare API\*\*, and \*\*Stape.io sGTM API\*\*. 



It allows analytics engineers to fully automate browser \& server-side tracking setups, verify DNS records, deploy Same-Origin proxy workers, and generate GA4/CAPI DataLayers using natural language!



\---



\## ✨ Features \& Capabilities



\* \*\*Full GTM Control:\*\* Manage accounts, containers, workspaces, tags, triggers, variables, templates (`.tpl`), and environments.

\* \*\*Stape.io Automation:\*\* Create sGTM containers, add custom domains (`metrics.yoursite.com`), and automatically retrieve DNS verification records.

\* \*\*Cloudflare Integration:\*\* Auto-lookup Zone IDs, manage verification DNS records (`CNAME`/`TXT`), and deploy Same-Origin tracking proxies to Cloudflare Workers.

\* \*\*DataLayer \& CAPI Validators:\*\* Build GA4 e-commerce DataLayers and inspect SHA256-hashed payloads for Meta CAPI, TikTok Server API, and Snapchat CAPI.



\---



\## 🛠️ Complete Tool Reference (26 Tools)



| Category | Tool Name | Description |

| :--- | :--- | :--- |

| \*\*GTM Account\*\* | `gtm\_account` | Manage GTM accounts (list, get, update). |

| \*\*GTM Container\*\* | `gtm\_container` | List, get, create, update, delete containers \& fetch snippets. |

| \*\*GTM Workspace\*\* | `gtm\_workspace` | Manage workspaces, sync changes, and resolve conflicts. |

| \*\*GTM Entities\*\* | `gtm\_tag` | Create, list, update, delete, and revert GTM Tags. |

| | `gtm\_trigger` | Create, list, update, delete, and revert GTM Triggers. |

| | `gtm\_variable` | Create, list, update, delete, and revert User-Defined Variables. |

| | `gtm\_built\_in\_variable` | Enable or disable GTM Built-In Variables. |

| | `gtm\_folder` | Manage folders and organize tags/triggers/variables. |

| \*\*sGTM \& Templates\*\* | `gtm\_client` | Manage sGTM Clients (GA4, Measurement Protocol, etc.). |

| | `gtm\_template` | Create \& manage Custom Tag/Variable Templates (`.tpl`). |

| | `gtm\_transformation` | Manage Server-Side Transformations. |

| | `gtm\_zone` | Manage GTM Zones (sub-containers). |

| | `gtm\_gtag\_config` | Configure Google Tag settings. |

| \*\*Versions \& Env\*\* | `gtm\_version` | List, publish, undelete, and set latest container versions. |

| | `gtm\_version\_header` | Retrieve version metadata and headers. |

| | `gtm\_environment` | Manage custom environments and authorization. |

| | `gtm\_destination` | Manage and link GA4 destinations. |

| | `gtm\_user\_permission` | Manage user permissions and access levels. |

| | `gtm\_raw` | Universal API escape hatch for custom Google API calls. |

| \*\*Cloudflare\*\* | `cloudflare\_zone\_lookup` | Automatically find Cloudflare Zone ID by domain name. |

| | `cloudflare\_dns\_manager` | Add, list, or delete DNS records (`TXT`, `CNAME`, `A`) for verification. |

| | `cloudflare\_worker\_deploy` | Deploy Same-Origin tracking proxy scripts to Cloudflare Workers. |

| \*\*Stape.io\*\* | `stape\_container\_manager` | Create sGTM containers, check status, or delete containers. |

| | `stape\_domain\_manager` | Add custom domains and fetch DNS verification records. |

| \*\*Analytics Suite\*\* | `genius\_datalayer\_builder` | Generate server-optimized GA4 e-commerce DataLayer snippets. |

| | `genius\_capi\_validator` | Validate Meta, TikTok \& Snapchat server-side payload structures. |



\---



\## 📦 Installation \& Setup



\### 1. Clone \& Install

```bash

git clone \[https://github.com/YOUR\_USERNAME/genius-gtm-mcp.git](https://github.com/YOUR\_USERNAME/genius-gtm-mcp.git)

cd genius-gtm-mcp

npm install

