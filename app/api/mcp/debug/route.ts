import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const parts = authHeader?.split(' ') || [];
  const bearerToken = parts[0]?.toLowerCase() === 'bearer' ? parts[1] : undefined;

  const mcpKey = process.env.MCP_SECRET_KEY;

  return NextResponse.json({
    has_mcp_key_env: !!mcpKey,
    mcp_key_length: mcpKey?.length || 0,
    mcp_key_prefix: mcpKey?.substring(0, 10) || 'NOT_SET',
    bearer_token_length: bearerToken?.length || 0,
    bearer_token_prefix: bearerToken?.substring(0, 10) || 'NOT_SET',
    tokens_match: mcpKey === bearerToken,
  });
}
