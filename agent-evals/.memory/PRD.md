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

## Phase 2: GUI Overhaul - Palantir Foundry Style

### Design System Reference (from Palantir screenshots)
- **Layout**: Left sidebar for navigation/filters, main content area with widgets, optional right panel for details
- **Header**: Light/dark header bar with breadcrumbs, action buttons (Save, Publish), version indicator
- **Colors**:
  - Background: White/light gray (#f8fafc) for main areas
  - Cards: White with subtle borders
  - Data: Green (#22c55e), Purple (#8b5cf6), Blue (#3b82f6), Teal (#14b8a6)
  - Status badges: Colored backgrounds with matching text (teal "640-730" style)
- **Charts**: Horizontal stacked bar charts, clean data visualization
- **Tables**: Clean rows with colored badge cells, monospace numbers
- **Forms**: Clean inputs with labels, dropdowns, clear submit buttons
- **Tabs**: Underline-style tab navigation within pages

```json
[
  {"id": 41, "category": "gui-v2", "description": "Design system - Create Palantir Foundry-inspired theme: light background (#f8fafc), white cards with borders, squared corners throughout, horizontal stacked bar charts, colored status badges (teal, purple, green). Left sidebar navigation with collapsible sections. Monospace fonts for data values.", "passes": true},
  {"id": 42, "category": "gui-v2", "description": "Navigation bar - Create top nav with: logo, breadcrumb navigation, action buttons (Save, Run), version indicator. Left sidebar with collapsible sections for filtering. Settings gear and user avatar on right.", "passes": true},
  {"id": 43, "category": "gui-v2", "description": "New Eval page - Full GUI wizard: Step 1: Name + description, Step 2: Agent config (type dropdown, endpoint input, headers), Step 3: Add tasks with variables/prompts, Step 4: Select graders, Step 5: Review & Run. Save config to DB, not just file.", "passes": true},
  {"id": 44, "category": "gui-v2", "description": "Eval results page - Palantir-style dashboard: header with eval name/ID/date, horizontal stacked bar charts showing pass/fail distribution, data table with colored score badges, right panel for selected item details.", "passes": true},
  {"id": 45, "category": "gui-v2", "description": "Results matrix component - Table with colored badge cells like Palantir (teal '640-730' style). Each cell shows score with color coding. Click to expand shows full details. Horizontal bar charts for visual comparison.", "passes": true},
  {"id": 46, "category": "gui-v2", "description": "Onboarding flow - When no evals exist: show welcome screen with 'Create your first eval' CTA, quick start guide, link to docs. When agent not configured: show setup instructions. Clear error states with actionable messages.", "passes": true},
  {"id": 47, "category": "gui-v2", "description": "Progress page - Real-time eval progress: current task/total, progress bar, live results as they complete. WebSocket connection to backend. Show estimated time remaining. Allow cancel.", "passes": true},
  {"id": 48, "category": "gui-v2", "description": "Dataset management - Page to create/view datasets (test cases). Import from CSV/JSON. Table view with variables. Edit inline. Use in eval wizard.", "passes": true},
  {"id": 49, "category": "gui-v2", "description": "Prompt templates - Page to manage prompt templates with {{variables}}. Preview with sample data. Version history. Use in eval wizard.", "passes": true},
  {"id": 50, "category": "gui-v2", "description": "Settings page - Configure: default agent endpoint, API keys (OpenAI, Anthropic), default graders, theme preferences. Store in localStorage + optional .env.", "passes": true},
  {"id": 51, "category": "gui-v2", "description": "API routes for GUI - POST /api/evals (create eval from wizard), POST /api/evals/:id/run (start eval), GET /api/evals/:id/progress (SSE for live updates), POST /api/datasets, POST /api/prompts.", "passes": true},
  {"id": 52, "category": "testing-v2", "description": "Browser workflow tests - Use browser-tester agent: Test complete user journey from landing → create eval → configure agent → add tasks → run eval → view results. Verify all buttons work, forms submit, data displays correctly.", "passes": true}
]
```

## Phase 3: Comprehensive Documentation

### Documentation Requirements
Users should be able to click "Read Documentation" and immediately understand:
- What Agent Evals does and why they need it
- How to get started in 5 minutes
- Complete API reference for all graders
- Advanced configuration options
- Troubleshooting common issues

```json
[
  {"id": 53, "category": "docs", "description": "Documentation page - Create /docs route with full documentation. Include: sidebar navigation with sections, search functionality, code examples with syntax highlighting, copy-to-clipboard for code blocks. Use MDX or similar for content.", "passes": true},
  {"id": 54, "category": "docs", "description": "Getting Started guide - Write comprehensive quickstart: Prerequisites (Node.js, npm), Installation (npx agenteval init), First Evaluation walkthrough, Understanding Results. Include screenshots and code examples.", "passes": true},
  {"id": 55, "category": "docs", "description": "Configuration Reference - Document all config options: YAML schema with examples, agent types and their options, task configuration, grader configuration, environment variables. Provide copy-pasteable examples.", "passes": true},
  {"id": 56, "category": "docs", "description": "Graders Documentation - Document each grader type: String Match (exact, contains, regex, fuzzy), JSON Validator, State Checker, Test Runner, LLM Rubric, Factuality, Similarity. Include when to use each, config options, examples.", "passes": true},
  {"id": 57, "category": "docs", "description": "Agent Types guide - Document specialized evaluators: Coding Agent (test pass, static analysis, code quality), Conversational Agent (user simulation, tone analysis), Research Agent (groundedness, coverage), Computer Use Agent (visual diff, state verification).", "passes": true},
  {"id": 58, "category": "docs", "description": "CLI Reference - Document all CLI commands: agenteval init (options, examples), agenteval run (flags, output formats), agenteval view (port configuration). Include common workflows and CI/CD integration.", "passes": true},
  {"id": 59, "category": "docs", "description": "API Reference - Document REST API endpoints: GET /api/evals (list), POST /api/evals (create), GET /api/evals/:id (detail), POST /api/evals/:id/run (execute). Include request/response schemas, error codes.", "passes": true},
  {"id": 60, "category": "docs", "description": "Troubleshooting guide - Document common issues: Connection errors, Timeout configuration, API key setup, Database errors, Grader failures. Include solutions and debugging steps.", "passes": true},
  {"id": 61, "category": "docs", "description": "Best Practices guide - Document: Writing effective test cases, Choosing graders, Performance optimization, Cost management (LLM calls), Organizing evaluations at scale.", "passes": true},
  {"id": 62, "category": "docs", "description": "Examples library - Create /docs/examples with complete eval configs: Customer Support Bot eval, Code Generation eval, Research Assistant eval, Multi-turn Conversation eval. Each with full YAML and expected results.", "passes": true}
]
```

## Phase 4: Iteration & Optimization System

### Capabilities (inspired by DSPy and Anthropic's eval best practices)
- Persist datasets and prompts to database with versioning
- Track regression baselines and detect capability changes
- Auto-prompt optimization that iterates against eval metrics
- Trend dashboard showing capability evolution over time

```json
[
  {"id": 63, "category": "persistence", "description": "Database schema for datasets/prompts - Add tables: datasets (id, name, description, variables, createdAt, updatedAt), dataset_rows (id, datasetId, data JSON), prompts (id, name, description, template, variables, version, createdAt). Add migrations.", "passes": true},
  {"id": 64, "category": "persistence", "description": "Migrate datasets API to database - Update /api/datasets to use Drizzle ORM instead of in-memory storage. Support CRUD operations, pagination, search. Add import/export CSV and JSON.", "passes": true},
  {"id": 65, "category": "persistence", "description": "Migrate prompts API to database - Update /api/prompts to use Drizzle ORM. Add version history tracking - each edit creates new version, can view/restore previous versions. Link prompts to evals that use them.", "passes": true},
  {"id": 66, "category": "regression", "description": "Baseline tracking - Add baselines table (id, name, evalId, metrics JSON, createdAt). API to mark an eval as baseline. Compare any eval against baseline showing metric deltas (pass rate, pass@k, latency).", "passes": true},
  {"id": 67, "category": "regression", "description": "Regression detection - Create regression checker that compares current eval to baseline. Flag regressions when: pass rate drops >5%, pass@1 drops >10%, latency increases >20%. Add alerts to eval results page.", "passes": true},
  {"id": 68, "category": "regression", "description": "Trend dashboard page - Create /trends page showing: pass rate over time (line chart), pass@k evolution, latency trends, cost per eval. Filter by eval suite, date range. Export data.", "passes": true},
  {"id": 69, "category": "optimizer", "description": "Prompt optimizer core - Create agent-evals/src/optimizer/prompt-optimizer.ts. DSPy-inspired optimizer that: generates candidate prompts, runs eval on each, scores by metric (pass@k, pass rate), selects best, iterates. Support bootstrap few-shot and MIPRO-style optimization.", "passes": true},
  {"id": 70, "category": "optimizer", "description": "Optimizer config schema - Add optimizer section to eval config: type (bootstrap|mipro|random), metric (pass_rate|pass_at_k|score), iterations, candidates_per_round, few_shot_examples. Validate with Zod.", "passes": true},
  {"id": 71, "category": "optimizer", "description": "Optimizer UI - Add /optimize page: select eval suite, choose optimization strategy, set parameters, run optimization. Show progress with live metrics. Display best prompt with diff from original. Save optimized prompt.", "passes": true},
  {"id": 72, "category": "optimizer", "description": "A/B comparison - Create comparison view: run same tasks with two different prompts side-by-side. Show per-task results, aggregate metrics, statistical significance. Help identify which prompt variant is better.", "passes": true},
  {"id": 73, "category": "integration", "description": "Eval suite management - Create /suites page to group related evals. Define suite with name, description, tasks, baselines. Run entire suite with one click. Track suite-level metrics over time.", "passes": true},
  {"id": 74, "category": "integration", "description": "CI/CD integration docs - Add docs section on CI integration: GitHub Actions workflow example, exit codes for pass/fail, JSON output for parsing, baseline comparison in PR checks, regression alerts.", "passes": true}
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
- Documentation is accessible and searchable

Fix any failures these subagents find.

## Completion Signal
When all tasks have passes: true and all subagent validations pass, output:
`<promise>COMPLETE</promise>`
