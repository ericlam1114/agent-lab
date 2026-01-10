'use client';

/**
 * Documentation Page (Task 53-62)
 * Comprehensive documentation with sidebar navigation
 */

import { useState } from 'react';
import Link from 'next/link';

// Documentation sections
const docSections = [
  { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
  { id: 'configuration', label: 'Configuration', icon: '⚙️' },
  { id: 'graders', label: 'Graders', icon: '✅' },
  { id: 'agent-types', label: 'Agent Types', icon: '🤖' },
  { id: 'cli', label: 'CLI Reference', icon: '💻' },
  { id: 'api', label: 'API Reference', icon: '🔌' },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: '🔧' },
  { id: 'best-practices', label: 'Best Practices', icon: '📚' },
  { id: 'examples', label: 'Examples', icon: '📝' },
];

// Code block with copy functionality
function CodeBlock({ code, language = 'yaml' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="code-block text-sm overflow-x-auto">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 text-xs bg-white border border-[var(--border)] opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

// Getting Started content
function GettingStartedContent() {
  return (
    <div>
      <h1 className="docs-heading">Getting Started</h1>
      <p className="docs-paragraph">
        Agent Evals is a comprehensive framework for evaluating AI agents. Whether you&apos;re building
        a coding assistant, customer support bot, or research agent, this tool helps you measure
        and improve your agent&apos;s performance.
      </p>

      <h2 className="docs-subheading">Prerequisites</h2>
      <ul className="list-disc list-inside mb-6 space-y-2 text-[var(--foreground-muted)]">
        <li>Node.js 18 or higher</li>
        <li>npm or yarn</li>
        <li>An AI agent with an HTTP endpoint (optional for getting started)</li>
      </ul>

      <h2 className="docs-subheading">Installation</h2>
      <p className="docs-paragraph">Install Agent Evals globally or as a dev dependency:</p>
      <CodeBlock code={`# Using npx (recommended)
npx agenteval init

# Or install globally
npm install -g agenteval

# Or as a dev dependency
npm install --save-dev agenteval`} language="bash" />

      <h2 className="docs-subheading">Quick Start</h2>
      <p className="docs-paragraph">
        The fastest way to get started is using the interactive init command:
      </p>

      <div className="space-y-4">
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Step 1: Initialize your project</h3>
          <CodeBlock code="npx agenteval init" language="bash" />
          <p className="text-sm text-[var(--foreground-muted)] mt-2">
            This creates an <code className="docs-code-inline">agenteval.yaml</code> config file with example tasks.
          </p>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-2">Step 2: Configure your agent</h3>
          <CodeBlock code={`# agenteval.yaml
name: my-first-eval
agent:
  type: http
  endpoint: https://api.example.com/chat
  headers:
    Authorization: Bearer $API_KEY
  timeout: 30000`} />
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-2">Step 3: Add test cases</h3>
          <CodeBlock code={`tasks:
  - description: Test greeting response
    input:
      prompt: "Hello, how are you?"
    graders:
      - type: contains
        value: "hello"
      - type: llm-rubric
        rubric: "Response should be friendly and professional"`} />
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-2">Step 4: Run the evaluation</h3>
          <CodeBlock code="npx agenteval run" language="bash" />
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-2">Step 5: View results</h3>
          <CodeBlock code="npx agenteval view" language="bash" />
          <p className="text-sm text-[var(--foreground-muted)] mt-2">
            This opens the web GUI where you can explore detailed results, transcripts, and metrics.
          </p>
        </div>
      </div>

      <h2 className="docs-subheading">Using the GUI</h2>
      <p className="docs-paragraph">
        You can also create and run evaluations entirely from the web interface:
      </p>
      <ol className="list-decimal list-inside mb-6 space-y-2 text-[var(--foreground-muted)]">
        <li>Navigate to <Link href="/evals/new" className="text-[var(--accent-primary)] hover:underline">New Eval</Link></li>
        <li>Follow the 5-step wizard to configure your evaluation</li>
        <li>Click &quot;Run Evaluation&quot; to start</li>
        <li>View real-time progress and results</li>
      </ol>
    </div>
  );
}

// Configuration content
function ConfigurationContent() {
  return (
    <div>
      <h1 className="docs-heading">Configuration Reference</h1>
      <p className="docs-paragraph">
        Agent Evals uses YAML configuration files to define evaluations. This reference covers
        all available options.
      </p>

      <h2 className="docs-subheading">Full Configuration Schema</h2>
      <CodeBlock code={`# agenteval.yaml - Complete schema
name: string                    # Required: Evaluation name
description: string             # Optional: Description

# Agent Configuration
agent:
  type: http | websocket | custom    # Required: Provider type
  endpoint: string                    # Required: Agent endpoint URL
  headers:                            # Optional: HTTP headers
    Authorization: string
    Content-Type: string
  timeout: number                     # Optional: Request timeout in ms (default: 30000)
  retries: number                     # Optional: Retry count on failure (default: 3)

# Task Configuration
tasks:
  - id: string                        # Optional: Unique task ID
    description: string               # Required: Task description
    type: prompt | multi-turn         # Optional: Task type (default: prompt)
    input:
      prompt: string                  # The prompt to send
      variables:                      # Optional: Variable substitutions
        name: value
    graders:                          # Required: List of graders
      - type: string
        # ... grader-specific config
    trials: number                    # Optional: Number of trials (default: 1)

# Global Settings
settings:
  concurrency: number                 # Parallel task execution (default: 5)
  stopOnFailure: boolean             # Stop on first failure (default: false)
  verbose: boolean                   # Verbose output (default: false)`} />

      <h2 className="docs-subheading">Agent Types</h2>

      <h3 className="font-semibold mt-6 mb-2">HTTP Agent</h3>
      <p className="docs-paragraph">The most common agent type, sends POST requests to an HTTP endpoint.</p>
      <CodeBlock code={`agent:
  type: http
  endpoint: https://api.example.com/v1/chat
  headers:
    Authorization: Bearer \${OPENAI_API_KEY}
    Content-Type: application/json
  timeout: 60000`} />

      <h3 className="font-semibold mt-6 mb-2">WebSocket Agent</h3>
      <p className="docs-paragraph">For real-time streaming agents.</p>
      <CodeBlock code={`agent:
  type: websocket
  endpoint: wss://api.example.com/ws
  headers:
    Authorization: Bearer \${API_KEY}`} />

      <h2 className="docs-subheading">Environment Variables</h2>
      <p className="docs-paragraph">
        Use environment variables for sensitive data like API keys:
      </p>
      <CodeBlock code={`# .env file
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AGENT_ENDPOINT=https://api.example.com

# Reference in config
agent:
  endpoint: \${AGENT_ENDPOINT}
  headers:
    Authorization: Bearer \${OPENAI_API_KEY}`} />
    </div>
  );
}

// Graders content
function GradersContent() {
  return (
    <div>
      <h1 className="docs-heading">Graders</h1>
      <p className="docs-paragraph">
        Graders evaluate your agent&apos;s responses. Agent Evals provides several built-in grader types,
        from simple string matching to AI-powered evaluation.
      </p>

      <h2 className="docs-subheading">String Match Graders</h2>

      <h3 className="font-semibold mt-6 mb-2">Contains</h3>
      <p className="docs-paragraph">Check if the output contains a specific string.</p>
      <CodeBlock code={`graders:
  - type: contains
    value: "expected text"
    caseSensitive: false  # Optional, default: false`} />

      <h3 className="font-semibold mt-6 mb-2">Exact Match</h3>
      <p className="docs-paragraph">Check for an exact string match.</p>
      <CodeBlock code={`graders:
  - type: exact
    value: "exact expected output"`} />

      <h3 className="font-semibold mt-6 mb-2">Regex</h3>
      <p className="docs-paragraph">Match against a regular expression pattern.</p>
      <CodeBlock code={`graders:
  - type: regex
    pattern: "\\\\d{3}-\\\\d{4}"  # Phone number pattern`} />

      <h3 className="font-semibold mt-6 mb-2">Fuzzy Match</h3>
      <p className="docs-paragraph">Allow for minor variations using Levenshtein distance.</p>
      <CodeBlock code={`graders:
  - type: fuzzy
    value: "expected output"
    threshold: 0.8  # 80% similarity required`} />

      <h2 className="docs-subheading">JSON Graders</h2>

      <h3 className="font-semibold mt-6 mb-2">Valid JSON</h3>
      <CodeBlock code={`graders:
  - type: json-valid`} />

      <h3 className="font-semibold mt-6 mb-2">JSON Schema</h3>
      <CodeBlock code={`graders:
  - type: json-schema
    schema:
      type: object
      required: [name, email]
      properties:
        name: { type: string }
        email: { type: string, format: email }`} />

      <h3 className="font-semibold mt-6 mb-2">Field Value</h3>
      <CodeBlock code={`graders:
  - type: json-field
    path: "user.status"
    value: "active"`} />

      <h2 className="docs-subheading">AI-Powered Graders</h2>

      <h3 className="font-semibold mt-6 mb-2">LLM Rubric</h3>
      <p className="docs-paragraph">Use an LLM to evaluate responses against a rubric.</p>
      <CodeBlock code={`graders:
  - type: llm-rubric
    rubric: |
      Evaluate the response on these criteria:
      1. Accuracy: Is the information correct?
      2. Completeness: Does it fully answer the question?
      3. Clarity: Is it easy to understand?

      Score 0-1 based on how well the criteria are met.
    model: gpt-4  # Optional, default uses configured model`} />

      <h3 className="font-semibold mt-6 mb-2">Factuality</h3>
      <p className="docs-paragraph">Verify claims against source material.</p>
      <CodeBlock code={`graders:
  - type: factuality
    sources:
      - "The capital of France is Paris"
      - "The Eiffel Tower was completed in 1889"`} />

      <h3 className="font-semibold mt-6 mb-2">Semantic Similarity</h3>
      <p className="docs-paragraph">Compare semantic meaning using embeddings.</p>
      <CodeBlock code={`graders:
  - type: similarity
    expected: "The weather today is sunny and warm"
    threshold: 0.85`} />

      <h2 className="docs-subheading">Code Graders</h2>

      <h3 className="font-semibold mt-6 mb-2">Test Runner</h3>
      <p className="docs-paragraph">Run tests on generated code.</p>
      <CodeBlock code={`graders:
  - type: test-runner
    command: "npm test"
    workingDirectory: "./generated"
    timeout: 60000`} />

      <h3 className="font-semibold mt-6 mb-2">State Checker</h3>
      <p className="docs-paragraph">Verify environment state after execution.</p>
      <CodeBlock code={`graders:
  - type: state-check
    checks:
      - type: file
        path: "./output.txt"
        exists: true
      - type: api
        url: "http://localhost:3000/status"
        expectStatus: 200`} />
    </div>
  );
}

// Agent Types content
function AgentTypesContent() {
  return (
    <div>
      <h1 className="docs-heading">Agent Types</h1>
      <p className="docs-paragraph">
        Agent Evals includes specialized evaluators for different types of AI agents.
        Each comes with pre-configured graders optimized for that use case.
      </p>

      <h2 className="docs-subheading">Coding Agent</h2>
      <p className="docs-paragraph">
        For evaluating code generation, refactoring, and debugging agents.
      </p>
      <CodeBlock code={`agent:
  type: http
  endpoint: https://api.example.com/code

tasks:
  - description: Generate a sorting function
    type: coding
    input:
      prompt: "Write a Python function to sort a list of integers"
    graders:
      - type: test-pass
        tests: |
          def test_sort():
            assert sort_list([3, 1, 2]) == [1, 2, 3]
            assert sort_list([]) == []
      - type: static-analysis
        linter: pylint
        minScore: 8.0
      - type: code-quality
        rubric: "Code should be readable, well-documented, and efficient"`} />

      <h2 className="docs-subheading">Conversational Agent</h2>
      <p className="docs-paragraph">
        For customer support, chatbots, and interactive assistants.
      </p>
      <CodeBlock code={`agent:
  type: http
  endpoint: https://api.example.com/chat

tasks:
  - description: Handle refund request
    type: conversational
    input:
      persona: "Frustrated customer wanting a refund"
      scenario: "Customer purchased item 2 weeks ago, wants full refund"
      maxTurns: 5
    graders:
      - type: resolution
        expectedOutcome: "Refund processed or clear explanation provided"
      - type: tone-analysis
        qualities: [empathetic, professional, helpful]
      - type: turn-limit
        maxTurns: 5`} />

      <h2 className="docs-subheading">Research Agent</h2>
      <p className="docs-paragraph">
        For fact-finding, summarization, and analysis agents.
      </p>
      <CodeBlock code={`agent:
  type: http
  endpoint: https://api.example.com/research

tasks:
  - description: Research company financials
    type: research
    input:
      query: "What were Apple's Q4 2024 revenue figures?"
    graders:
      - type: groundedness
        sources: ["apple-10q-2024.pdf"]
      - type: coverage
        requiredFacts:
          - "Total revenue"
          - "iPhone revenue"
          - "Year-over-year growth"
      - type: source-quality
        preferredDomains: [sec.gov, apple.com]`} />

      <h2 className="docs-subheading">Computer Use Agent</h2>
      <p className="docs-paragraph">
        For browser automation and desktop interaction agents.
      </p>
      <CodeBlock code={`agent:
  type: http
  endpoint: https://api.example.com/computer-use

tasks:
  - description: Fill out contact form
    type: computer-use
    input:
      task: "Navigate to example.com and submit the contact form"
      environment:
        type: browser
        startUrl: "https://example.com"
    graders:
      - type: screenshot-compare
        expected: "./expected-confirmation.png"
        threshold: 0.95
      - type: state-verify
        selector: ".success-message"
        exists: true
      - type: action-sequence
        expectedActions:
          - { type: click, target: "Contact" }
          - { type: fill, target: "email", value: "*" }
          - { type: click, target: "Submit" }`} />
    </div>
  );
}

// CLI Reference content
function CLIContent() {
  return (
    <div>
      <h1 className="docs-heading">CLI Reference</h1>
      <p className="docs-paragraph">
        The Agent Evals CLI provides commands for initializing, running, and viewing evaluations.
      </p>

      <h2 className="docs-subheading">agenteval init</h2>
      <p className="docs-paragraph">Initialize a new evaluation project.</p>
      <CodeBlock code={`# Interactive mode
npx agenteval init

# With options
npx agenteval init --name "my-eval" --agent-type http

# Options:
#   --name        Evaluation name
#   --agent-type  Agent type (http, websocket, custom)
#   --endpoint    Agent endpoint URL
#   --output      Output file path (default: agenteval.yaml)`} language="bash" />

      <h2 className="docs-subheading">agenteval run</h2>
      <p className="docs-paragraph">Run an evaluation.</p>
      <CodeBlock code={`# Run with default config
npx agenteval run

# Run with specific config
npx agenteval run --config ./my-eval.yaml

# Options:
#   --config, -c    Config file path (default: agenteval.yaml)
#   --verbose, -v   Verbose output
#   --quiet, -q     Minimal output (for CI)
#   --no-cache      Disable result caching
#   --concurrency   Number of parallel tasks
#   --output        Output format (json, table, markdown)
#   --output-file   Save results to file`} language="bash" />

      <h2 className="docs-subheading">agenteval view</h2>
      <p className="docs-paragraph">Launch the web GUI to view results.</p>
      <CodeBlock code={`# Start GUI server
npx agenteval view

# Options:
#   --port, -p     Server port (default: 3000)
#   --eval-id      Show specific evaluation
#   --no-open      Don't auto-open browser`} language="bash" />

      <h2 className="docs-subheading">CI/CD Integration</h2>
      <p className="docs-paragraph">Example GitHub Actions workflow:</p>
      <CodeBlock code={`# .github/workflows/eval.yml
name: Agent Evaluation

on:
  push:
    branches: [main]
  pull_request:

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run evaluations
        run: npx agenteval run --quiet --output json --output-file results.json
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: eval-results
          path: results.json

      - name: Check pass rate
        run: |
          PASS_RATE=$(jq '.metrics.passRate' results.json)
          if (( $(echo "$PASS_RATE < 0.8" | bc -l) )); then
            echo "Pass rate $PASS_RATE is below threshold 0.8"
            exit 1
          fi`} language="yaml" />
    </div>
  );
}

// API Reference content
function APIContent() {
  return (
    <div>
      <h1 className="docs-heading">API Reference</h1>
      <p className="docs-paragraph">
        Agent Evals provides a REST API for programmatic access to evaluations.
      </p>

      <h2 className="docs-subheading">Evaluations</h2>

      <h3 className="font-semibold mt-6 mb-2">List Evaluations</h3>
      <CodeBlock code={`GET /api/evals

Query Parameters:
  page      Page number (default: 1)
  limit     Results per page (default: 20)
  status    Filter by status (running, completed, failed)
  search    Search by name

Response:
{
  "evals": [
    {
      "id": "uuid",
      "name": "My Evaluation",
      "status": "completed",
      "totalTasks": 10,
      "completedTasks": 10,
      "passedTrials": 8,
      "totalTrials": 10,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "stats": {
    "total": 100,
    "running": 2,
    "completed": 95,
    "failed": 3,
    "avgPassRate": 0.85
  }
}`} />

      <h3 className="font-semibold mt-6 mb-2">Create Evaluation</h3>
      <CodeBlock code={`POST /api/evals

Request Body:
{
  "name": "My Evaluation",
  "description": "Testing customer support agent",
  "agent": {
    "type": "http",
    "endpoint": "https://api.example.com/chat",
    "headers": {},
    "timeout": 30000
  },
  "tasks": [
    {
      "description": "Test greeting",
      "input": "Hello!",
      "variables": {}
    }
  ],
  "graders": [
    { "type": "contains", "value": "hello" }
  ]
}

Response:
{
  "id": "uuid",
  "name": "My Evaluation",
  "status": "pending",
  "message": "Evaluation created successfully"
}`} />

      <h3 className="font-semibold mt-6 mb-2">Get Evaluation Details</h3>
      <CodeBlock code={`GET /api/evals/:id

Response:
{
  "eval": {
    "id": "uuid",
    "name": "My Evaluation",
    "status": "completed",
    "config": {...},
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:35:00Z"
  },
  "tasks": [
    {
      "id": "task-uuid",
      "description": "Test greeting",
      "avgScore": 0.9,
      "passRate": 0.9,
      "trials": [...]
    }
  ],
  "metrics": {
    "totalTasks": 10,
    "totalTrials": 10,
    "passedTrials": 9,
    "passRate": 0.9,
    "avgLatencyMs": 1250
  }
}`} />

      <h3 className="font-semibold mt-6 mb-2">Run Evaluation</h3>
      <CodeBlock code={`POST /api/evals/:id/run

Response:
{
  "status": "started",
  "message": "Evaluation started"
}`} />

      <h2 className="docs-subheading">Error Codes</h2>
      <div className="overflow-x-auto">
        <table className="table-tactical">
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="data-value">400</td><td>Bad Request - Invalid parameters</td></tr>
            <tr><td className="data-value">401</td><td>Unauthorized - Missing or invalid API key</td></tr>
            <tr><td className="data-value">404</td><td>Not Found - Resource doesn&apos;t exist</td></tr>
            <tr><td className="data-value">422</td><td>Validation Error - Invalid configuration</td></tr>
            <tr><td className="data-value">500</td><td>Server Error - Internal error</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Troubleshooting content
function TroubleshootingContent() {
  return (
    <div>
      <h1 className="docs-heading">Troubleshooting</h1>
      <p className="docs-paragraph">
        Common issues and their solutions.
      </p>

      <h2 className="docs-subheading">Connection Errors</h2>

      <div className="card p-4 mb-4">
        <h3 className="font-semibold text-[var(--status-fail)]">Error: ECONNREFUSED</h3>
        <p className="text-sm text-[var(--foreground-muted)] mt-2">
          <strong>Cause:</strong> The agent endpoint is not reachable.
        </p>
        <p className="text-sm text-[var(--foreground-muted)] mt-2">
          <strong>Solution:</strong>
        </p>
        <ul className="list-disc list-inside text-sm text-[var(--foreground-muted)] ml-4">
          <li>Verify the endpoint URL is correct</li>
          <li>Check if the agent server is running</li>
          <li>Ensure there are no firewall rules blocking the connection</li>
        </ul>
      </div>

      <div className="card p-4 mb-4">
        <h3 className="font-semibold text-[var(--status-fail)]">Error: ETIMEDOUT</h3>
        <p className="text-sm text-[var(--foreground-muted)] mt-2">
          <strong>Cause:</strong> Request exceeded the timeout limit.
        </p>
        <p className="text-sm text-[var(--foreground-muted)] mt-2">
          <strong>Solution:</strong> Increase the timeout in your config:
        </p>
        <CodeBlock code={`agent:
  timeout: 60000  # 60 seconds`} />
      </div>

      <h2 className="docs-subheading">API Key Issues</h2>

      <div className="card p-4 mb-4">
        <h3 className="font-semibold text-[var(--status-fail)]">Error: Invalid API Key</h3>
        <p className="text-sm text-[var(--foreground-muted)] mt-2">
          <strong>Solution:</strong> Ensure your API keys are set correctly:
        </p>
        <CodeBlock code={`# Create a .env file
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Or export in your shell
export OPENAI_API_KEY=sk-your-key-here`} language="bash" />
      </div>

      <h2 className="docs-subheading">Grader Failures</h2>

      <div className="card p-4 mb-4">
        <h3 className="font-semibold text-[var(--status-warning)]">LLM Rubric returns low scores</h3>
        <p className="text-sm text-[var(--foreground-muted)] mt-2">
          <strong>Tips:</strong>
        </p>
        <ul className="list-disc list-inside text-sm text-[var(--foreground-muted)] ml-4">
          <li>Make your rubric more specific with clear criteria</li>
          <li>Include examples of good and bad responses</li>
          <li>Use a more capable model (e.g., GPT-4 instead of GPT-3.5)</li>
        </ul>
      </div>

      <h2 className="docs-subheading">Database Errors</h2>

      <div className="card p-4 mb-4">
        <h3 className="font-semibold text-[var(--status-fail)]">Error: SQLITE_CANTOPEN</h3>
        <p className="text-sm text-[var(--foreground-muted)] mt-2">
          <strong>Cause:</strong> Database file cannot be created or accessed.
        </p>
        <p className="text-sm text-[var(--foreground-muted)] mt-2">
          <strong>Solution:</strong>
        </p>
        <ul className="list-disc list-inside text-sm text-[var(--foreground-muted)] ml-4">
          <li>Ensure the .agentevals directory exists and is writable</li>
          <li>Check disk space</li>
          <li>Delete the database file and let it recreate: <code className="docs-code-inline">rm .agentevals/db.sqlite</code></li>
        </ul>
      </div>

      <h2 className="docs-subheading">Getting Help</h2>
      <p className="docs-paragraph">
        If you&apos;re still stuck:
      </p>
      <ul className="list-disc list-inside text-[var(--foreground-muted)]">
        <li>Check the <a href="https://github.com/anthropics/agent-evals/issues" className="text-[var(--accent-primary)] hover:underline">GitHub Issues</a></li>
        <li>Run with <code className="docs-code-inline">--verbose</code> for detailed logs</li>
        <li>Export your config (without secrets) when reporting issues</li>
      </ul>
    </div>
  );
}

// Best Practices content
function BestPracticesContent() {
  return (
    <div>
      <h1 className="docs-heading">Best Practices</h1>
      <p className="docs-paragraph">
        Tips for getting the most out of Agent Evals.
      </p>

      <h2 className="docs-subheading">Writing Effective Test Cases</h2>
      <ul className="list-disc list-inside mb-6 space-y-2 text-[var(--foreground-muted)]">
        <li><strong>Be specific:</strong> Clear, unambiguous prompts get better results</li>
        <li><strong>Cover edge cases:</strong> Test error handling, empty inputs, long inputs</li>
        <li><strong>Use realistic data:</strong> Test with data similar to production</li>
        <li><strong>Include negative tests:</strong> Verify the agent rejects bad inputs</li>
      </ul>

      <h2 className="docs-subheading">Choosing Graders</h2>
      <div className="overflow-x-auto mb-6">
        <table className="table-tactical">
          <thead>
            <tr>
              <th>Use Case</th>
              <th>Recommended Graders</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Exact output required</td>
              <td><span className="badge badge-teal">exact</span> <span className="badge badge-teal">json-schema</span></td>
            </tr>
            <tr>
              <td>Flexible text matching</td>
              <td><span className="badge badge-teal">contains</span> <span className="badge badge-teal">fuzzy</span></td>
            </tr>
            <tr>
              <td>Quality assessment</td>
              <td><span className="badge badge-purple">llm-rubric</span></td>
            </tr>
            <tr>
              <td>Factual accuracy</td>
              <td><span className="badge badge-purple">factuality</span></td>
            </tr>
            <tr>
              <td>Code generation</td>
              <td><span className="badge badge-green">test-runner</span> <span className="badge badge-green">static-analysis</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="docs-subheading">Performance Optimization</h2>
      <ul className="list-disc list-inside mb-6 space-y-2 text-[var(--foreground-muted)]">
        <li><strong>Use caching:</strong> Avoid re-running identical evaluations</li>
        <li><strong>Set appropriate concurrency:</strong> Balance speed vs. rate limits</li>
        <li><strong>Use fast graders first:</strong> Put cheap checks before LLM graders</li>
        <li><strong>Batch similar tasks:</strong> Group tasks that share configuration</li>
      </ul>

      <h2 className="docs-subheading">Cost Management</h2>
      <CodeBlock code={`# Use cheaper models for development
graders:
  - type: llm-rubric
    model: gpt-3.5-turbo  # Cheaper for testing
    rubric: "..."

# Cache aggressively
settings:
  cacheResults: true
  cacheTTL: 3600  # 1 hour

# Limit trials in development
tasks:
  - description: "..."
    trials: 1  # Use 3+ in production`} />

      <h2 className="docs-subheading">Organizing Evaluations</h2>
      <CodeBlock code={`# Recommended directory structure
project/
├── evals/
│   ├── customer-support/
│   │   ├── agenteval.yaml
│   │   └── fixtures/
│   ├── code-generation/
│   │   └── agenteval.yaml
│   └── research/
│       └── agenteval.yaml
├── .env
└── .agentevals/
    └── db.sqlite`} language="bash" />
    </div>
  );
}

// Examples content
function ExamplesContent() {
  return (
    <div>
      <h1 className="docs-heading">Examples</h1>
      <p className="docs-paragraph">
        Complete evaluation configurations for common use cases.
      </p>

      <h2 className="docs-subheading">Customer Support Bot</h2>
      <CodeBlock code={`# customer-support-eval.yaml
name: Customer Support Bot Evaluation
description: Evaluate our support bot's ability to handle common queries

agent:
  type: http
  endpoint: https://api.example.com/support-bot
  headers:
    Authorization: Bearer \${SUPPORT_BOT_API_KEY}
  timeout: 30000

tasks:
  - description: Handle password reset request
    input:
      prompt: "I forgot my password and can't log in"
    graders:
      - type: contains
        value: "password reset"
      - type: llm-rubric
        rubric: |
          The response should:
          1. Acknowledge the user's frustration
          2. Provide clear steps to reset password
          3. Offer alternative help if needed
          Score: 0.8+ for helpful response

  - description: Handle refund request
    input:
      prompt: "I want a refund for order #12345"
    graders:
      - type: contains
        value: "refund"
      - type: llm-rubric
        rubric: |
          Response should:
          1. Ask for order verification
          2. Explain refund policy
          3. Be empathetic

  - description: Handle angry customer
    input:
      prompt: "This is the WORST service ever! I've been waiting 3 hours!"
    graders:
      - type: llm-rubric
        rubric: |
          Response MUST:
          1. Acknowledge frustration
          2. Apologize sincerely
          3. NOT be defensive
          4. Offer concrete help

settings:
  concurrency: 3
  trials: 2`} />

      <h2 className="docs-subheading">Code Generation</h2>
      <CodeBlock code={`# code-gen-eval.yaml
name: Code Generation Evaluation
description: Test code generation quality

agent:
  type: http
  endpoint: https://api.example.com/code-gen
  timeout: 60000

tasks:
  - description: Generate sorting function
    input:
      prompt: |
        Write a Python function called 'sort_numbers' that:
        - Takes a list of integers
        - Returns the list sorted in ascending order
        - Handles empty lists
    graders:
      - type: contains
        value: "def sort_numbers"
      - type: test-runner
        command: "python -m pytest tests/test_sort.py"
        timeout: 30000

  - description: Generate API client
    input:
      prompt: |
        Create a Python class 'WeatherClient' that:
        - Has a constructor taking an API key
        - Has method 'get_forecast(city)' returning weather data
        - Handles errors gracefully
    graders:
      - type: contains
        value: "class WeatherClient"
      - type: llm-rubric
        rubric: |
          Code quality checklist:
          - Error handling present
          - Type hints used
          - Docstrings included
          - Clean naming conventions`} />

      <h2 className="docs-subheading">Research Assistant</h2>
      <CodeBlock code={`# research-eval.yaml
name: Research Assistant Evaluation
description: Test research accuracy and sourcing

agent:
  type: http
  endpoint: https://api.example.com/research

tasks:
  - description: Historical fact lookup
    input:
      prompt: "When was the first iPhone released and what were its key features?"
    graders:
      - type: factuality
        sources:
          - "The first iPhone was announced on January 9, 2007"
          - "It was released on June 29, 2007"
          - "Key features included touchscreen, Safari browser, iPod integration"
      - type: contains
        value: "2007"

  - description: Current events research
    input:
      prompt: "What are the latest developments in AI regulation?"
    graders:
      - type: llm-rubric
        rubric: |
          Response should:
          1. Mention specific regulations or proposals
          2. Include dates/timeframes
          3. Cite authoritative sources
          4. Be balanced and factual`} />
    </div>
  );
}

// Main documentation page
export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started');

  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return <GettingStartedContent />;
      case 'configuration':
        return <ConfigurationContent />;
      case 'graders':
        return <GradersContent />;
      case 'agent-types':
        return <AgentTypesContent />;
      case 'cli':
        return <CLIContent />;
      case 'api':
        return <APIContent />;
      case 'troubleshooting':
        return <TroubleshootingContent />;
      case 'best-practices':
        return <BestPracticesContent />;
      case 'examples':
        return <ExamplesContent />;
      default:
        return <GettingStartedContent />;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="docs-sidebar">
        <div className="p-4">
          <h2 className="font-bold text-lg mb-4">Documentation</h2>
          <nav className="space-y-1">
            {docSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`docs-nav-item w-full text-left flex items-center gap-2 ${
                  activeSection === section.id ? 'active' : ''
                }`}
              >
                <span>{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="docs-content flex-1">
        {renderContent()}
      </main>
    </div>
  );
}
