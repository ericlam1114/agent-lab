# Getting Started with Agent Lab

Agent Lab is a framework for evaluating AI agents systematically. You define tasks with graders. The framework runs your agent against them. You get pass/fail results with scores.

## Recommended: Use the Web GUI

The fastest way to get started is with the web interface:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and click **Create Your First Eval**. The wizard walks you through:
1. Naming your evaluation
2. Configuring your agent endpoint
3. Adding test cases
4. Selecting graders
5. Running and viewing results

This is the fully functional, battle-tested path.

---

## Alternative: CLI (Experimental)

The CLI exists but has limitations. The graders are partially implemented - some work, some are placeholders. Use it for experimentation, not production.

I'm assuming you have Node.js 18+ and the repo cloned locally.

## Why Evaluate Your Agents?

Ship with confidence. Catch regressions before users do. Know exactly when your agent gets better or worse.

Key benefits:
- **Reproducibility** - Same test, same conditions, every time
- **Visibility** - See exactly where your agent fails
- **Multiple graders** - Combine exact match, regex, LLM rubric, test runners
- **Multiple trials** - Run each task N times to measure consistency

## 1. Initialize Your Config

Run the interactive init command:

```bash
npm run agenteval -- init
```

You'll be prompted for:
- Evaluation name
- Agent type (coding, conversational, research, computer-use)
- Agent API endpoint

This creates `agenteval.yaml` in your project root and a `.agentevals/` directory with a sample custom grader.

For non-interactive setup:

```bash
npm run agenteval -- init --name my-eval --type coding --endpoint http://localhost:3000/api/agent --non-interactive
```

## 2. Configure Your Agent

Edit `agenteval.yaml`. The agent section tells Agent Lab how to talk to your agent:

```yaml
agent:
  type: http
  endpoint: http://localhost:3000/api/agent
  timeout: 30000
  headers:
    Authorization: Bearer ${AGENT_API_KEY}
  retries: 3
```

Agent types:
- `http` - REST API endpoint (requires `endpoint`)
- `cli` - Command-line tool (requires `command`)
- `sdk` - Direct SDK integration

Environment variables like `${AGENT_API_KEY}` are interpolated at runtime.

## 3. Define Your Tasks

Tasks live in the `tasks` array. Each task needs an ID, description, input, and at least one grader:

```yaml
tasks:
  - id: factorial-function
    type: coding
    description: Generate a factorial function
    input:
      prompt: "Write a TypeScript function that calculates the factorial of a number"
    graders:
      - type: test-runner
        command: npm test
        pattern: "factorial"
      - type: llm-rubric
        rubric: |
          Evaluate the code:
          1. Correctness (0-1): Does it handle edge cases like 0 and negative numbers?
          2. Readability (0-1): Is the code clean?
```

Available grader types:
- `exact-match` - Output must match exactly
- `contains` - Output must contain a string
- `regex` - Output must match a pattern
- `fuzzy-match` - Similarity threshold (default 0.8)
- `json-valid` - Output must be valid JSON
- `json-schema` - Output must match a JSON schema
- `test-runner` - Run a test command
- `llm-rubric` - LLM grades against a rubric
- `factuality` - LLM checks factual accuracy
- `state-check` - Check external state (API, file, etc.)

## 4. Run Your Evaluation

```bash
npm run agenteval -- run
```

You'll see a progress bar and results table:

```
🚀 Running evaluation: my-agent-eval
   Tasks: 3
   Trials per task: 3
   Concurrency: 2

[████████████████████████████████████████] 100% (3/3)

📊 Results:

-----------+--------+-------+--------+--------+--------------------------------
 Task      | Status | Score | Trials | Passed | Details
-----------+--------+-------+--------+--------+--------------------------------
 factorial | ✓ PASS | 100%  | 3      | 3      | All tests passed
 sort      | ✗ FAIL | 66.7% | 3      | 2      | Edge case failed
-----------+--------+-------+--------+--------+--------------------------------

📈 Summary:
   Pass Rate: 83.3%
   Total Time: 12.4s
   Status: ✓ PASSED
```

## 5. Customize Your Run

Override settings from the command line:

```bash
# Run specific tasks
npm run agenteval -- run --tasks factorial,sort

# More trials for consistency testing
npm run agenteval -- run --trials 5

# Higher concurrency for faster runs
npm run agenteval -- run --concurrency 4

# Save results to file
npm run agenteval -- run --save results.json

# Quiet mode for CI
npm run agenteval -- run --quiet
```

## 6. Configure Settings

Fine-tune evaluation behavior in `agenteval.yaml`:

```yaml
settings:
  trialsPerTask: 3        # Run each task 3 times
  maxConcurrency: 5       # Run up to 5 tasks in parallel
  passThreshold: 0.5      # 50% pass rate to pass overall
  timeout: 60000          # 60 second timeout per task
  retries: 3              # Retry failed API calls
  stopOnFailure: false    # Continue even if tasks fail
  randomizeOrder: false   # Run tasks in defined order
```

## 7. Use the Web Dashboard

For visual results and historical tracking, start the web UI:

```bash
npm run dev
```

Open `http://localhost:3000`. You'll see:
- Recent evaluations with pass rates
- Task-by-task breakdowns
- Historical trends over time

## Make It Your Own

Agent Lab supports four agent types out of the box. Each comes with sensible defaults.

**Coding agents** - Test code generation with test runners and rubrics. The framework runs your test suite and grades the output.

**Conversational agents** - Multi-turn conversation testing. Define user personas, track empathy and resolution metrics.

**Research agents** - Test information gathering. Grade for accuracy, completeness, and source quality.

**Computer-use agents** - Browser and desktop automation. Verify state changes via API checks or screenshots.

**Custom graders** - Write TypeScript functions in `.agentevals/graders/` for domain-specific evaluation. The sample grader shows the interface:

```typescript
export async function customGrader(
  output: string,
  expected?: string
): Promise<GraderResult> {
  const passed = output.includes('expected value');
  return {
    graderId: 'my-grader',
    graderType: 'custom',
    passed,
    score: passed ? 1 : 0,
    details: 'Custom validation logic',
  };
}
```

---

**Recommended next step:** Open `http://localhost:3000` after running `npm run dev` and create your first evaluation through the GUI.
