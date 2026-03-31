// app/api/mcp/route.ts
// MCP (Model Context Protocol) server endpoint for JKKN AI Forms
// Enables Claude to create forms, manage events, view responses conversationally

import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { verifyToken } from '@/lib/mcp/auth';
import { registerTools } from '@/lib/mcp/tools';

const baseHandler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  {
    serverInfo: {
      name: 'JKKN AI Forms',
      version: '1.0.0',
    },
  },
  {
    basePath: '/api',
    streamableHttpEndpoint: '/mcp',
    maxDuration: 60,
  }
);

const handler = withMcpAuth(baseHandler, verifyToken, {
  required: false, // Allow unauthenticated tool listing (discovery)
});

export { handler as GET, handler as POST, handler as DELETE };
