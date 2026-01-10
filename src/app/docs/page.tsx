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
  { id: 'cicd', label: 'CI/CD Integration', icon: '🔄' },
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
        Agent Evals is a framework for evaluating AI agents. Whether you&apos;re building
        a coding assistant, customer support bot, or research agent, this tool helps you measure
        and improve your agent&apos;s performance.
      </p>

      <h2 className="docs-subheading">Prerequisites</h2>
      <ul className="list-disc list-inside mb-6 space-y-2 text-[var(--foreground-muted)]">
        <li>Node.js 18 or higher</li>
        <li>npm or yarn</li>
        <li>This repository cloned locally</li>
      </ul>

      <h2 className="docs-subheading">Installation</h2>
      <p className="docs-paragraph">Clone the repo and install dependencies:</p>
      <CodeBlock code={`git clone <repo-url>
cd agent-lab
npm install`} language="bash" />

      <h2 className="docs-subheading">Quick Start (Recommended)</h2>
      <p className="docs-paragraph">
        The fastest way to get started is using the Web GUI:
      </p>

      <div className="space-y-4">
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Step 1: Start the dev server</h3>
          <CodeBlock code="npm run dev" language="bash" />
          <p className="text-sm text-[var(--foreground-muted)] mt-2">
            Open <code className="docs-code-inline">http://localhost:3000</code> in your browser.
          </p>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-2">Step 2: Create your first evaluation</h3>
          <p className="text-sm text-[var(--foreground-muted)]">
            Click <Link href="/evals/new" className="text-[var(--accent-primary)] hover:underline">New Eval</Link> and follow the 5-step wizard:
          </p>
          <ol className="list-decimal list-inside mt-2 text-sm text-[var(--foreground-muted)]">
            <li>Name your evaluation</li>
            <li>Configure your agent endpoint</li>
            <li>Add test cases with prompts</li>
            <li>Select graders (contains, regex, LLM rubric, etc.)</li>
            <li>Review and run</li>
          </ol>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-2">Step 3: View results</h3>
          <p className="text-sm text-[var(--foreground-muted)]">
            Results appear in real-time as tasks complete. You&apos;ll see pass rates, individual task scores, and detailed grader feedback.
          </p>
        </div>
      </div>

      <h2 className="docs-subheading">Key Features</h2>
      <ul className="list-disc list-inside mb-6 space-y-2 text-[var(--foreground-muted)]">
        <li><strong>Datasets:</strong> Create reusable test datasets at <Link href="/datasets" className="text-[var(--accent-primary)] hover:underline">/datasets</Link></li>
        <li><strong>Prompts:</strong> Manage prompt templates with variables at <Link href="/prompts" className="text-[var(--accent-primary)] hover:underline">/prompts</Link></li>
        <li><strong>Trends:</strong> Track performance over time at <Link href="/trends" className="text-[var(--accent-primary)] hover:underline">/trends</Link></li>
        <li><strong>Optimization:</strong> Auto-improve prompts at <Link href="/optimize" className="text-[var(--accent-primary)] hover:underline">/optimize</Link></li>
        <li><strong>Comparison:</strong> A/B test prompts at <Link href="/compare" className="text-[var(--accent-primary)] hover:underline">/compare</Link></li>
      </ul>

      <h2 className="docs-subheading">CLI (Experimental)</h2>
      <p className="docs-paragraph">
        A CLI exists for local use but is experimental. See the <button className="text-[var(--accent-primary)] hover:underline" onClick={() => {}}>CLI Reference</button> for details.
        For production workflows, use the GUI.
      </p>
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

      <div className="card p-4 mb-6 bg-amber-900/20 border border-amber-800">
        <h3 className="font-semibold text-amber-400 mb-2">Experimental</h3>
        <p className="text-sm text-amber-300">
          The CLI is experimental and only works locally within this project. Use <code className="docs-code-inline">npm run agenteval</code> instead of <code className="docs-code-inline">npx agenteval</code>.
          Some graders are placeholder implementations. <strong>For production use, we recommend the Web GUI.</strong>
        </p>
      </div>

      <p className="docs-paragraph">
        The CLI provides commands for initializing, running, and viewing evaluations from the terminal.
      </p>

      <h2 className="docs-subheading">agenteval init</h2>
      <p className="docs-paragraph">Initialize a new evaluation project.</p>
      <CodeBlock code={`# Interactive mode (local only)
npm run agenteval -- init

# With options
npm run agenteval -- init --name "my-eval" --type coding --endpoint http://localhost:3000/api/agent

# Options:
#   --name        Evaluation name
#   --type        Agent type (coding, conversational, research, computer-use)
#   --endpoint    Agent endpoint URL
#   --output      Output file path (default: agenteval.yaml)`} language="bash" />

      <h2 className="docs-subheading">agenteval run</h2>
      <p className="docs-paragraph">Run an evaluation.</p>
      <CodeBlock code={`# Run with default config
npm run agenteval -- run

# Run with specific config
npm run agenteval -- run --config ./my-eval.yaml

# Options:
#   --config, -c    Config file path (default: agenteval.yaml)
#   --verbose, -v   Verbose output
#   --quiet, -q     Minimal output (for CI)
#   --trials        Number of trials per task
#   --concurrency   Number of parallel tasks
#   --save          Save results to file`} language="bash" />

      <h2 className="docs-subheading">agenteval view</h2>
      <p className="docs-paragraph">Launch the web GUI. (Prefer using <code className="docs-code-inline">npm run dev</code> directly.)</p>
      <CodeBlock code={`# Just use the dev server directly
npm run dev

# Opens at http://localhost:3000`} language="bash" />

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
        run: npm run agenteval -- run --quiet --output json --output-file results.json
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

// CI/CD Integration content
function CICDContent() {
  return (
    <div>
      <h1 className="docs-heading">CI/CD Integration</h1>

      <div className="card p-4 mb-6 bg-amber-900/20 border border-amber-800">
        <h3 className="font-semibold text-amber-400 mb-2">Work In Progress</h3>
        <p className="text-sm text-amber-300">
          CI/CD integration requires a properly packaged CLI tool. The current CLI is experimental
          and runs via <code className="docs-code-inline">npm run agenteval</code> locally only.
          The examples below show the intended architecture for when the CLI is production-ready.
        </p>
      </div>

      <p className="docs-paragraph">
        The goal is to integrate Agent Evals into your CI/CD pipeline to automatically run evaluations on every commit,
        detect regressions, and gate deployments based on performance thresholds.
      </p>

      <h2 className="docs-subheading">Current Options</h2>
      <p className="docs-paragraph">
        For now, you can integrate with CI/CD by:
      </p>
      <ul className="list-disc list-inside mb-6 space-y-2 text-[var(--foreground-muted)]">
        <li><strong>API-based:</strong> Call the <code className="docs-code-inline">/api/evals</code> endpoints from your CI scripts</li>
        <li><strong>Local CLI:</strong> Run <code className="docs-code-inline">npm run agenteval -- run</code> in your repo (requires the full project)</li>
        <li><strong>Manual:</strong> Use the web GUI for evaluation before merging</li>
      </ul>

      <h2 className="docs-subheading">Future: GitHub Actions</h2>
      <p className="docs-paragraph">When the CLI is packaged, workflows will look like:</p>
      <CodeBlock code={`# .github/workflows/agent-eval.yml
name: Agent Evaluation

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
  ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run agent evaluations
        id: eval
        run: |
          npm run agenteval -- run --quiet --output json --output-file results.json
          echo "pass_rate=$(jq -r '.metrics.passRate' results.json)" >> $GITHUB_OUTPUT
          echo "pass_at_1=$(jq -r '.metrics.passAt1' results.json)" >> $GITHUB_OUTPUT

      - name: Upload results artifact
        uses: actions/upload-artifact@v4
        with:
          name: eval-results
          path: results.json
          retention-days: 30

      - name: Check pass rate threshold
        run: |
          PASS_RATE=\${{ steps.eval.outputs.pass_rate }}
          THRESHOLD=0.80
          if (( $(echo "$PASS_RATE < $THRESHOLD" | bc -l) )); then
            echo "::error::Pass rate $PASS_RATE is below threshold $THRESHOLD"
            exit 1
          fi
          echo "Pass rate $PASS_RATE meets threshold $THRESHOLD"

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const passRate = '\${{ steps.eval.outputs.pass_rate }}';
            const passAt1 = '\${{ steps.eval.outputs.pass_at_1 }}';
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## Agent Evaluation Results\\n\\n' +
                    '| Metric | Value |\\n' +
                    '|--------|-------|\\n' +
                    '| Pass Rate | ' + (passRate * 100).toFixed(1) + '% |\\n' +
                    '| Pass@1 | ' + (passAt1 * 100).toFixed(1) + '% |'
            })`} language="yaml" />

      <h2 className="docs-subheading">GitLab CI</h2>
      <p className="docs-paragraph">GitLab CI/CD configuration:</p>
      <CodeBlock code={`# .gitlab-ci.yml
stages:
  - test
  - evaluate
  - deploy

variables:
  OPENAI_API_KEY: $OPENAI_API_KEY
  ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY

agent-eval:
  stage: evaluate
  image: node:20
  script:
    - npm ci
    - npm run agenteval -- run --quiet --output json --output-file results.json
    - |
      PASS_RATE=$(jq -r '.metrics.passRate' results.json)
      echo "Pass Rate: $PASS_RATE"
      if (( $(echo "$PASS_RATE < 0.80" | bc -l) )); then
        echo "Evaluation failed: pass rate below threshold"
        exit 1
      fi
  artifacts:
    paths:
      - results.json
    reports:
      metrics: results.json
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"`} language="yaml" />

      <h2 className="docs-subheading">Regression Detection</h2>
      <p className="docs-paragraph">
        Compare against baselines to detect performance regressions:
      </p>
      <CodeBlock code={`# regression-check.yml
name: Regression Check

on:
  push:
    branches: [main]

jobs:
  regression-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run evaluation
        run: npm run agenteval -- run --output json --output-file current.json

      - name: Download baseline
        uses: actions/download-artifact@v4
        with:
          name: baseline-results
          path: ./baseline
        continue-on-error: true

      - name: Compare with baseline
        run: |
          if [ -f "./baseline/results.json" ]; then
            BASELINE_PASS_RATE=$(jq -r '.metrics.passRate' ./baseline/results.json)
            CURRENT_PASS_RATE=$(jq -r '.metrics.passRate' current.json)

            REGRESSION=$(echo "$BASELINE_PASS_RATE - $CURRENT_PASS_RATE" | bc -l)
            THRESHOLD=0.05  # 5% regression threshold

            if (( $(echo "$REGRESSION > $THRESHOLD" | bc -l) )); then
              echo "::error::Regression detected! Pass rate dropped from $BASELINE_PASS_RATE to $CURRENT_PASS_RATE"
              exit 1
            fi
            echo "No regression detected"
          else
            echo "No baseline found, skipping comparison"
          fi

      - name: Update baseline (on main)
        if: github.ref == 'refs/heads/main' && success()
        uses: actions/upload-artifact@v4
        with:
          name: baseline-results
          path: current.json
          overwrite: true`} language="yaml" />

      <h2 className="docs-subheading">Eval Suites in CI</h2>
      <p className="docs-paragraph">
        Run different eval suites for different scenarios:
      </p>
      <CodeBlock code={`# Run specific suites based on changed files
name: Targeted Evaluations

on:
  push:
    paths:
      - 'src/agents/support/**'
      - 'src/agents/code/**'

jobs:
  eval-support:
    if: contains(github.event.head_commit.modified, 'src/agents/support/')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run agenteval -- run --config evals/support-eval.yaml

  eval-code:
    if: contains(github.event.head_commit.modified, 'src/agents/code/')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run agenteval -- run --config evals/code-eval.yaml`} language="yaml" />

      <h2 className="docs-subheading">Deployment Gates</h2>
      <p className="docs-paragraph">
        Block deployments if evaluations fail:
      </p>
      <CodeBlock code={`# deploy-with-eval-gate.yml
name: Deploy with Eval Gate

on:
  push:
    branches: [main]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    outputs:
      passed: \${{ steps.check.outputs.passed }}
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run agenteval -- run --output json --output-file results.json

      - id: check
        run: |
          PASS_RATE=$(jq -r '.metrics.passRate' results.json)
          if (( $(echo "$PASS_RATE >= 0.85" | bc -l) )); then
            echo "passed=true" >> $GITHUB_OUTPUT
          else
            echo "passed=false" >> $GITHUB_OUTPUT
          fi

  deploy:
    needs: evaluate
    if: needs.evaluate.outputs.passed == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # Your deployment commands here

  notify-failure:
    needs: evaluate
    if: needs.evaluate.outputs.passed == 'false'
    runs-on: ubuntu-latest
    steps:
      - name: Notify team
        run: |
          echo "Evaluation failed - deployment blocked"
          # Send Slack/email notification`} language="yaml" />

      <h2 className="docs-subheading">Scheduled Evaluations</h2>
      <p className="docs-paragraph">
        Run evaluations on a schedule to monitor agent performance over time:
      </p>
      <CodeBlock code={`# scheduled-eval.yml
name: Scheduled Evaluation

on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  daily-eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci

      - name: Run full evaluation suite
        run: npm run agenteval -- run --config evals/full-suite.yaml --output json --output-file daily-results.json

      - name: Upload to dashboard
        run: |
          curl -X POST https://your-dashboard.com/api/results \\
            -H "Authorization: Bearer \${{ secrets.DASHBOARD_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            -d @daily-results.json

      - name: Alert on degradation
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Daily agent evaluation failed!",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Daily Agent Evaluation Failed*\\n<\${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}|View Run>"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK }}`} language="yaml" />

      <h2 className="docs-subheading">Environment Variables</h2>
      <p className="docs-paragraph">
        Required secrets and environment variables for CI/CD:
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="table-tactical">
          <thead>
            <tr>
              <th>Variable</th>
              <th>Description</th>
              <th>Required</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code className="docs-code-inline">OPENAI_API_KEY</code></td>
              <td>API key for OpenAI models and graders</td>
              <td>If using OpenAI</td>
            </tr>
            <tr>
              <td><code className="docs-code-inline">ANTHROPIC_API_KEY</code></td>
              <td>API key for Claude models</td>
              <td>If using Anthropic</td>
            </tr>
            <tr>
              <td><code className="docs-code-inline">AGENT_ENDPOINT</code></td>
              <td>Your agent&apos;s API endpoint</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td><code className="docs-code-inline">EVAL_PASS_THRESHOLD</code></td>
              <td>Minimum pass rate (default: 0.8)</td>
              <td>No</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="docs-subheading">Best Practices</h2>
      <ul className="list-disc list-inside mb-6 space-y-2 text-[var(--foreground-muted)]">
        <li><strong>Cache dependencies:</strong> Use npm/yarn cache to speed up CI runs</li>
        <li><strong>Run in parallel:</strong> Split eval suites across multiple jobs</li>
        <li><strong>Store baselines:</strong> Keep baseline results as artifacts for regression detection</li>
        <li><strong>Set timeouts:</strong> Prevent hung evaluations from blocking pipelines</li>
        <li><strong>Use secrets:</strong> Never commit API keys to your repository</li>
        <li><strong>Notify on failure:</strong> Set up alerts for failed evaluations</li>
        <li><strong>Track trends:</strong> Upload results to a dashboard for trend analysis</li>
      </ul>
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
      case 'cicd':
        return <CICDContent />;
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
