# Agent Evals Framework - PRD

## Overview
Build an agent evaluation framework inspired by promptfoo, designed specifically for evaluating AI agents (coding, conversational, research, computer use). Features HTTP API integration, code-based/model-based/human graders, and both CLI + Web GUI.

## Quality Standards
This is production code. Must be maintainable, well-tested, and follow TypeScript best practices. Use existing patterns in the codebase. Run build/lint/test before committing.

## Tasks

```json
[
  {"id": 1, "category": "foundation", "description": "Project setup - Create folder structure under agent-evals/src with core/, graders/, providers/, agent-types/, db/, cli/, server/ directories. Install dependencies: drizzle-orm, better-sqlite3, commander, zod, yaml, socket.io, socket.io-client, openai, @anthropic-ai/sdk, recharts, uuid. Add devDependencies: drizzle-kit, vitest, @playwright/test. Update package.json scripts.", "passes": true},
  {"id": 2, "category": "foundation", "description": "Database schema - Create agent-evals/src/db/schema.ts with Drizzle ORM tables: evals (id, name, config, createdAt, status), tasks (id, evalId, description, type, input, graders, metrics), trials (id, taskId, attempt, status, score, transcript, outcome, startedAt, completedAt), results (id, trialId, graderId, score, passed, details). Create migrations folder.", "passes": true},
  {"id": 3, "category": "foundation", "description": "Config parser - Create agent-evals/src/config/schema.ts with Zod schemas for YAML config validation. Define AgentConfig (type, endpoint, timeout), TaskConfig (id, type, description, input, graders, tracked_metrics), GraderConfig (type, rubric/expect/value), EvalConfig (name, description, agent, tasks, settings). Create parseConfig function that reads YAML and validates.", "passes": true},
  {"id": 4, "category": "foundation", "description": "HTTP provider - Create agent-evals/src/providers/http-provider.ts. Implement HttpProvider class with: constructor(config: AgentConfig), callAgent(input: any): Promise<AgentResponse> method that POSTs to endpoint, handles timeouts, retries on failure, captures full response including tool calls. Define AgentResponse type with output, toolCalls, latency, tokens.", "passes": true},
  {"id": 5, "category": "foundation", "description": "Task runner - Create agent-evals/src/core/task-runner.ts. Implement TaskRunner class that: takes a task config and provider, executes the task by calling provider.callAgent(), captures timing metrics, handles errors gracefully, returns TaskResult with response, error, metrics.", "passes": true},
  {"id": 6, "category": "foundation", "description": "Transcript capture - Create agent-evals/src/core/transcript.ts. Implement Transcript class that records: all messages (user, assistant, tool calls, tool results), timestamps for each message, token counts, tool execution details. Provide toJSON() for serialization and fromJSON() for deserialization.", "passes": true},
  {"id": 7, "category": "foundation", "description": "Basic evaluator - Create agent-evals/src/core/evaluator.ts. Implement Evaluator class that: loads config, initializes provider, runs tasks with configurable concurrency (Promise pool), collects results, saves to database. Add progress callback for reporting.", "passes": true},
  {"id": 8, "category": "foundation", "description": "Trial manager - Create agent-evals/src/core/trial-manager.ts. Implement TrialManager that: runs N trials per task (configurable), calculates pass@k (probability of at least 1 success in k attempts), calculates pass^k (probability all k succeed), aggregates scores across trials, stores individual trial results.", "passes": true},
  {"id": 9, "category": "graders", "description": "String match grader - Create agent-evals/src/graders/code-based/string-match.ts. Implement graders: exactMatch(expected), containsString(substring), regex(pattern), fuzzyMatch(expected, threshold) using Levenshtein distance. Each returns GraderResult with passed, score (0-1), details.", "passes": true},
  {"id": 10, "category": "graders", "description": "JSON validator grader - Create agent-evals/src/graders/code-based/json-validator.ts. Implement: isValidJson(), matchesSchema(zodSchema), hasFields(fieldPaths), fieldEquals(path, value). Handle nested paths like 'user.address.city'. Return detailed error messages on failure.", "passes": true},
  {"id": 11, "category": "graders", "description": "State checker grader - Create agent-evals/src/graders/code-based/state-checker.ts. Implement StateChecker that verifies environment state after agent execution. Support checking: database records (via SQL query), file existence/contents, API state (via HTTP call). Config format: {type: 'db'|'file'|'api', query/path/url, expect}.", "passes": true},
  {"id": 12, "category": "graders", "description": "Test runner grader - Create agent-evals/src/graders/code-based/test-runner.ts. Implement TestRunner that: executes test commands (npm test, pytest, etc.), parses test output for pass/fail counts, supports custom test patterns, returns score based on pass percentage. Handle timeout and command errors.", "passes": true},
  {"id": 13, "category": "graders", "description": "LLM rubric grader - Create agent-evals/src/graders/model-based/llm-rubric.ts. Implement LLMRubric that: takes a rubric string describing evaluation criteria, calls LLM (OpenAI or Anthropic) with transcript + rubric, parses structured response for score and reasoning, supports multi-dimension rubrics. Add caching to avoid redundant calls.", "passes": true},
  {"id": 14, "category": "graders", "description": "Factuality grader - Create agent-evals/src/graders/model-based/factuality.ts. Implement FactualityGrader that: extracts claims from agent response, verifies each claim against provided source material, returns score based on percentage of supported claims, flags unsupported claims in details.", "passes": true},
  {"id": 15, "category": "graders", "description": "Similarity grader - Create agent-evals/src/graders/model-based/similarity.ts. Implement SemanticSimilarity that: generates embeddings for expected and actual output (via OpenAI embeddings API), calculates cosine similarity, returns score with configurable threshold for pass/fail.", "passes": true},
  {"id": 16, "category": "graders", "description": "Human review queue - Create agent-evals/src/graders/human/review-queue.ts. Implement HumanReviewQueue that: stores trials needing human review in database, provides API to list pending reviews, accepts human scores and feedback, updates trial results when reviewed. Add to database schema if needed.", "passes": true},
  {"id": 17, "category": "agent-types", "description": "Coding agent evaluator - Create agent-evals/src/agent-types/coding-agent.ts. Implement CodingAgentEvaluator with specialized graders: TestPassGrader (runs unit tests on generated code), StaticAnalysisGrader (runs linter/type checker), CodeQualityGrader (LLM rubric for maintainability). Support for setting up test environment.", "passes": true},
  {"id": 18, "category": "agent-types", "description": "Conversational agent evaluator - Create agent-evals/src/agent-types/conversational-agent.ts. Implement ConversationalAgentEvaluator with: UserSimulator (LLM that plays user role based on persona), TurnLimitChecker, ToneAnalyzer (LLM grader for empathy/professionalism), ResolutionChecker (verifies task completed).", "passes": true},
  {"id": 19, "category": "agent-types", "description": "Research agent evaluator - Create agent-evals/src/agent-types/research-agent.ts. Implement ResearchAgentEvaluator with: GroundednessGrader (claims supported by sources), CoverageGrader (key facts included), SourceQualityGrader (authoritative sources used), AnswerAccuracyGrader (for factual questions).", "passes": true},
  {"id": 20, "category": "agent-types", "description": "Computer use agent evaluator - Create agent-evals/src/agent-types/computer-use-agent.ts. Implement ComputerUseAgentEvaluator with: ScreenshotComparer (visual diff), StateVerifier (check DOM/app state), ActionSequenceChecker (verify expected actions taken). Support for browser/desktop environment setup.", "passes": true},
  {"id": 21, "category": "cli", "description": "CLI framework setup - Create agent-evals/src/cli/index.ts as entry point. Setup Commander.js with global options: --config, --verbose, --output-format (json/table/markdown). Create bin entry in package.json pointing to compiled CLI. Add 'agenteval' command name.", "passes": true},
  {"id": 22, "category": "cli", "description": "agenteval init command - Create agent-evals/src/cli/init.ts. Implement interactive init that: prompts for eval name, agent type, endpoint URL, creates starter YAML config with example tasks, creates .agentevals directory structure, writes sample grader configs.", "passes": true},
  {"id": 23, "category": "cli", "description": "agenteval run command - Create agent-evals/src/cli/run.ts. Implement run command that: loads config file, initializes evaluator, runs all tasks with progress bar (using cli-progress or similar), outputs results summary, saves detailed results to file, returns exit code based on pass rate.", "passes": true},
  {"id": 24, "category": "cli", "description": "agenteval view command - Create agent-evals/src/cli/view.ts. Implement view command that: starts Express server on specified port, serves Next.js GUI, opens browser automatically (using open package), shows latest eval results by default, supports --eval-id to view specific eval.", "passes": true},
  {"id": 25, "category": "gui", "description": "Dashboard page - Update app/page.tsx to be the dashboard. Show: recent evals list with status/score, quick stats (total evals, avg pass rate, common failures), quick actions (run new eval, view latest). Use Recharts for visualizations. Fetch data from API routes.", "passes": true},
  {"id": 26, "category": "gui", "description": "Eval list page - Create app/evals/page.tsx. Show paginated list of all evals with: name, date, status, pass rate, task count. Add filters for status, date range, agent type. Add search by name. Link each row to detail page.", "passes": true},
  {"id": 27, "category": "gui", "description": "Eval detail page - Create app/evals/[id]/page.tsx. Show: eval config summary, overall metrics (pass rate, avg latency, token usage), task breakdown with individual scores, grader results per task. Add re-run button.", "passes": true},
  {"id": 28, "category": "gui", "description": "Results table component - Create app/components/ResultsTable.tsx. Matrix view showing tasks (rows) x trials (columns). Each cell shows: pass/fail icon, score, click to expand details. Support sorting by score, filtering by status. Color-code by score ranges.", "passes": true},
  {"id": 29, "category": "gui", "description": "Transcript viewer - Create app/components/TranscriptViewer.tsx. Show full message history with: collapsible tool calls, syntax highlighting for code, timestamps, token counts per message. Add copy-to-clipboard for individual messages. Support search within transcript.", "passes": true},
  {"id": 30, "category": "gui", "description": "Task editor - Create app/components/TaskEditor.tsx. Visual editor for creating/editing tasks: form fields for description, type, input. Grader selection with config UI. Preview of YAML output. Validation feedback. Save to config file.", "passes": true},
  {"id": 31, "category": "gui", "description": "Real-time updates - Create agent-evals/src/server/socket.ts. Implement Socket.io server that: emits progress during eval runs (task started, task completed, trial result), allows clients to subscribe to specific eval updates. Update GUI components to use WebSocket for live updates.", "passes": true},
  {"id": 32, "category": "gui", "description": "Export/share functionality - Add export buttons to eval detail page. Support: JSON export (full results), CSV export (summary table), Markdown report generation. Add shareable URL that encodes eval config (for reproducibility).", "passes": true},
  {"id": 33, "category": "polish", "description": "Error handling & retry logic - Add comprehensive error handling throughout: wrap provider calls in try-catch with typed errors, implement exponential backoff for retries, add circuit breaker for repeated failures, log errors with context. Create custom error classes.", "passes": true},
  {"id": 34, "category": "polish", "description": "Caching layer - Create agent-evals/src/core/cache.ts. Implement hash-based caching: hash task input + config, check cache before running, store results with TTL. Support: memory cache, file-based cache, cache invalidation. Add --no-cache CLI flag.", "passes": true},
  {"id": 35, "category": "polish", "description": "Metrics aggregation - Create agent-evals/src/core/metrics.ts. Calculate and store: pass@k, pass^k for configurable k values, latency percentiles (p50, p95, p99), token usage breakdown, cost estimation (based on model pricing). Add to eval results.", "passes": true},
  {"id": 36, "category": "polish", "description": "Progress reporting - Enhance CLI progress output: show current task/total, elapsed time, estimated remaining, live pass rate. Add --quiet mode for CI. Add --json-progress for programmatic consumption. Update GUI progress indicators to match.", "passes": true},
  {"id": 37, "category": "testing", "description": "Unit tests for core - Create tests using Vitest. Test: config parser (valid/invalid configs), task runner (success/failure/timeout), trial manager (pass@k calculation), each grader type with known inputs/outputs. Aim for >80% coverage of core/.", "passes": true},
  {"id": 38, "category": "testing", "description": "Integration tests - Create integration tests that: spin up mock agent server, run full eval cycle, verify results in database, test CLI commands end-to-end. Use test fixtures for reproducible scenarios.", "passes": true},
  {"id": 39, "category": "testing", "description": "Browser tests - Create Playwright tests for GUI: dashboard loads and shows data, eval list pagination works, detail page shows correct eval, transcript viewer expands/collapses, task editor saves correctly. Run against dev server.", "passes": true},
  {"id": 40, "category": "testing", "description": "Security scan - Run security scanner on codebase. Check for: SQL injection in database queries (use parameterized queries), XSS in GUI components (escape user input), command injection in test runner (validate commands), API key exposure (use env vars). Fix any findings.", "passes": true}
]
```

## Phase 2: GUI Overhaul - Palantir Style + Promptfoo Features

### Design System
- **Style**: Palantir-inspired military/tactical look
- **Corners**: Squared (no rounded corners)
- **Colors**: Dark theme with high contrast, monospace fonts for data
- **UI Reference**: promptfoo screenshots for layout inspiration

```json
[
  {"id": 41, "category": "gui-v2", "description": "Design system - Create Tailwind theme with Palantir-style: squared corners (rounded-none), dark tactical colors (slate-900, zinc-800), accent colors (amber-500 for warnings, emerald-500 for pass, red-500 for fail), monospace fonts for data. Update tailwind.config with custom theme.", "passes": false},
  {"id": 42, "category": "gui-v2", "description": "Navigation bar - Create top nav like promptfoo: logo, 'New Eval', 'Evals', 'Prompts', 'Datasets', 'Progress' tabs. Add user menu, settings gear icon. Fixed position, dark background.", "passes": false},
  {"id": 43, "category": "gui-v2", "description": "New Eval page - Full GUI wizard: Step 1: Name + description, Step 2: Agent config (type dropdown, endpoint input, headers), Step 3: Add tasks with variables/prompts, Step 4: Select graders, Step 5: Review & Run. Save config to DB, not just file.", "passes": false},
  {"id": 44, "category": "gui-v2", "description": "Eval results page - Like promptfoo: header with eval name, ID, date, model info. Severity cards (Critical/High/Medium/Low). Results matrix with Variables (rows) x Outputs (columns). Pass/fail badges with scores. Token counts, latency, cost per cell.", "passes": false},
  {"id": 45, "category": "gui-v2", "description": "Results matrix component - Table with: Variable inputs as rows, different prompt/model outputs as columns. Each cell shows PASS/FAIL badge with score (0.92), expandable output preview, tokens count, latency, cost. Color-coded by pass rate.", "passes": false},
  {"id": 46, "category": "gui-v2", "description": "Onboarding flow - When no evals exist: show welcome screen with 'Create your first eval' CTA, quick start guide, link to docs. When agent not configured: show setup instructions. Clear error states with actionable messages.", "passes": false},
  {"id": 47, "category": "gui-v2", "description": "Progress page - Real-time eval progress: current task/total, progress bar, live results as they complete. WebSocket connection to backend. Show estimated time remaining. Allow cancel.", "passes": false},
  {"id": 48, "category": "gui-v2", "description": "Dataset management - Page to create/view datasets (test cases). Import from CSV/JSON. Table view with variables. Edit inline. Use in eval wizard.", "passes": false},
  {"id": 49, "category": "gui-v2", "description": "Prompt templates - Page to manage prompt templates with {{variables}}. Preview with sample data. Version history. Use in eval wizard.", "passes": false},
  {"id": 50, "category": "gui-v2", "description": "Settings page - Configure: default agent endpoint, API keys (OpenAI, Anthropic), default graders, theme preferences. Store in localStorage + optional .env.", "passes": false},
  {"id": 51, "category": "gui-v2", "description": "API routes for GUI - POST /api/evals (create eval from wizard), POST /api/evals/:id/run (start eval), GET /api/evals/:id/progress (SSE for live updates), POST /api/datasets, POST /api/prompts.", "passes": false},
  {"id": 52, "category": "testing-v2", "description": "Browser workflow tests - Use browser-tester agent: Test complete user journey from landing → create eval → configure agent → add tasks → run eval → view results. Verify all buttons work, forms submit, data displays correctly.", "passes": false}
]
```

## After All Tasks Complete
Deploy 8 subagents to validate:
- 3 unit test subagents (run vitest, check coverage)
- 3 browser test subagents (run Playwright tests with REAL user workflows)
- 2 security scanner subagents (check for vulnerabilities)

**Browser tests MUST verify:**
- User can navigate entire app
- Create new eval wizard works end-to-end
- Results display correctly with pass/fail badges
- All buttons and forms are functional
- Proper error/loading states shown

Fix any failures these subagents find.

## Completion Signal
When all tasks have passes: true and all subagent validations pass, output:
`<promise>COMPLETE</promise>`
