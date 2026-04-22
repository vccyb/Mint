import { NextResponse } from 'next/server';

interface ToolInfo {
  name: string;
  category: 'native' | 'sdk' | 'mcp';
  description: string;
}

const MODEL_NATIVE_TOOLS: ToolInfo[] = [
  { name: '对话/推理', category: 'native', description: 'Multi-turn conversation and logical reasoning' },
  { name: '代码理解', category: 'native', description: 'Code comprehension and analysis' },
  { name: '视觉理解', category: 'native', description: 'Image and visual content understanding' },
  { name: 'PDF理解', category: 'native', description: 'PDF document parsing and comprehension' },
];

const SDK_TOOLS: ToolInfo[] = [
  { name: 'Bash', category: 'sdk', description: 'Execute shell commands' },
  { name: 'Read', category: 'sdk', description: 'Read file contents' },
  { name: 'Write', category: 'sdk', description: 'Create or overwrite files' },
  { name: 'Edit', category: 'sdk', description: 'Make targeted edits to files' },
  { name: 'Glob', category: 'sdk', description: 'Find files by pattern' },
  { name: 'Grep', category: 'sdk', description: 'Search content with regex' },
  { name: 'WebSearch', category: 'sdk', description: 'Search the web for information' },
  { name: 'WebFetch', category: 'sdk', description: 'Fetch and read web pages' },
  { name: 'Task', category: 'sdk', description: 'Launch sub-agents for complex tasks' },
  { name: 'Skill', category: 'sdk', description: 'Invoke specialized skills' },
];

export async function GET() {
  const tools: ToolInfo[] = [
    ...MODEL_NATIVE_TOOLS,
    ...SDK_TOOLS,
    // MCP tools placeholder — would be populated from running MCP servers
  ];

  return NextResponse.json({ tools });
}
