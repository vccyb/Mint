import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') ?? '';
    const normalizedQuery = q === '*' ? '' : q.toLowerCase();

    // MCP tools will be populated when Feature 6 (MCP Server Connection) is complete.
    // For now, return an empty list.
    const mcpTools: Array<{ type: string; label: string; value: string; description: string }> = [];

    const results = mcpTools.filter((t) => {
      if (!normalizedQuery) return true;
      return (
        t.label.toLowerCase().includes(normalizedQuery) ||
        t.description.toLowerCase().includes(normalizedQuery)
      );
    });

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search MCP tools' },
      { status: 500 },
    );
  }
}
