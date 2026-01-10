'use client';

/**
 * TranscriptViewer Component (Task 29)
 * Full message history with collapsible tool calls
 */

import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: string;
  tokens?: number;
  toolCallId?: string;
  toolName?: string;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  error?: string;
}

interface TranscriptViewerProps {
  messages: Message[];
  toolCalls?: ToolCall[];
  searchable?: boolean;
}

export function TranscriptViewer({
  messages,
  toolCalls = [],
  searchable = true,
}: TranscriptViewerProps) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleTool = (id: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTools(newExpanded);
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMessages = searchQuery
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
      case 'assistant':
        return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      case 'system':
        return 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700';
      case 'tool':
        return 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-zinc-50 dark:bg-zinc-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'user':
        return 'User';
      case 'assistant':
        return 'Assistant';
      case 'system':
        return 'System';
      case 'tool':
        return 'Tool Result';
      default:
        return role;
    }
  };

  const formatCode = (content: string) => {
    // Simple code block detection and formatting
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'code', content: match[2], language: match[1] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: 'text' as const, content }];
  };

  return (
    <div className="w-full">
      {/* Search */}
      {searchable && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Messages */}
      <div className="space-y-4">
        {filteredMessages.map((message, index) => {
          const messageId = `msg-${index}`;
          const parts = formatCode(message.content);

          return (
            <div
              key={messageId}
              className={`border rounded-lg overflow-hidden ${getRoleStyle(message.role)}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-inherit bg-white/50 dark:bg-black/20">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">
                    {getRoleLabel(message.role)}
                  </span>
                  {message.timestamp && (
                    <span className="text-xs text-zinc-500">{message.timestamp}</span>
                  )}
                  {message.tokens !== undefined && (
                    <span className="text-xs text-zinc-500">
                      {message.tokens} tokens
                    </span>
                  )}
                </div>
                <button
                  onClick={() => copyToClipboard(message.content, messageId)}
                  className="text-xs px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  {copiedId === messageId ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Content */}
              <div className="px-4 py-3">
                {parts.map((part, partIndex) =>
                  part.type === 'code' ? (
                    <pre
                      key={partIndex}
                      className="mt-2 p-3 rounded bg-zinc-800 text-zinc-100 text-sm overflow-x-auto font-mono"
                    >
                      {part.language && (
                        <div className="text-xs text-zinc-400 mb-2">{part.language}</div>
                      )}
                      <code>{part.content}</code>
                    </pre>
                  ) : (
                    <p key={partIndex} className="text-sm whitespace-pre-wrap">
                      {part.content}
                    </p>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tool Calls */}
      {toolCalls.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-3 text-zinc-700 dark:text-zinc-300">
            Tool Calls ({toolCalls.length})
          </h3>
          <div className="space-y-2">
            {toolCalls.map((tool) => (
              <div
                key={tool.id}
                className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleTool(tool.id)}
                  className="w-full flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">
                      {expandedTools.has(tool.id) ? '▼' : '▶'}
                    </span>
                    <span className="font-mono text-sm font-medium">{tool.name}</span>
                    {tool.error && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                        Error
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">{tool.id}</span>
                </button>

                {expandedTools.has(tool.id) && (
                  <div className="px-4 py-3 space-y-3 border-t border-zinc-200 dark:border-zinc-700">
                    <div>
                      <div className="text-xs font-medium text-zinc-500 mb-1">
                        Arguments
                      </div>
                      <pre className="p-2 rounded bg-zinc-100 dark:bg-zinc-900 text-xs overflow-x-auto">
                        {JSON.stringify(JSON.parse(tool.arguments || '{}'), null, 2)}
                      </pre>
                    </div>
                    {tool.result && (
                      <div>
                        <div className="text-xs font-medium text-zinc-500 mb-1">
                          Result
                        </div>
                        <pre className="p-2 rounded bg-zinc-100 dark:bg-zinc-900 text-xs overflow-x-auto max-h-48">
                          {tool.result}
                        </pre>
                      </div>
                    )}
                    {tool.error && (
                      <div>
                        <div className="text-xs font-medium text-red-500 mb-1">Error</div>
                        <pre className="p-2 rounded bg-red-50 dark:bg-red-900/30 text-xs text-red-700 dark:text-red-300 overflow-x-auto">
                          {tool.error}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredMessages.length === 0 && (
        <div className="text-center py-8 text-zinc-500">
          {searchQuery ? 'No messages match your search' : 'No messages in transcript'}
        </div>
      )}
    </div>
  );
}
