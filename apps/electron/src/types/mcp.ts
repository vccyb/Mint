export interface McpServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

export interface McpConnectionTestResult {
  status: 'connected' | 'error';
  tools: Array<{ name: string; description: string }>;
  error?: string;
  latencyMs: number;
}
