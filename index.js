#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server({
  name: "genius-gtm-mcp",
  version: "1.0.0"
}, {
  capabilities: { tools: {} }
});

// টুল ডিফাইন করা (GA4 DataLayer জেনারেটর)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_ga4_datalayer",
        description: "Generate standard GA4 dataLayer snippet for Server-side tracking.",
        inputSchema: {
          type: "object",
          properties: {
            eventName: { type: "string", description: "Event name e.g., view_item, purchase" }
          },
          required: ["eventName"]
        }
      }
    ]
  };
});

// টুলের লজিক
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "generate_ga4_datalayer") {
    const { eventName } = request.params.arguments;
    
    const snippet = `window.dataLayer = window.dataLayer || [];\nwindow.dataLayer.push({\n  event: "${eventName}"\n});`;
    
    return {
      content: [{ type: "text", text: snippet }]
    };
  }
  throw new Error("Tool not found");
});

const transport = new StdioServerTransport();
await server.connect(transport);