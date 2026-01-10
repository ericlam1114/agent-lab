# Getting Started with Agent Lab

Agent Lab is a framework for evaluating AI agents systematically. You define test cases. The framework runs your agent against them. You get pass/fail results with detailed traces.

This guide walks you through your first evaluation. We'll test an AI agent's HTTP endpoint against a set of prompts.

I'm assuming you have Node.js 18+ installed. The concepts translate to any agent that accepts HTTP requests.

## Why Evaluate Your Agents?

Ship with confidence. Catch regressions before users do. Know exactly when your agent gets better or worse.

Key benefits:
- **Reproducibility** - Same test, same conditions, every time
- **Visibility** - See exactly where your agent fails
- **Iteration speed** - Change your prompt, rerun, compare results
- **Cost tracking** - Know how many tokens each test case burns

## 1. Install Agent Lab

```bash
npx agenteval init
```

This scaffolds a config file and example test cases in your project.

Alternatively, install globally:

```bash
npm i -g agenteval
```

## 2. Configure Your Agent Endpoint

Agent Lab needs to know how to talk to your agent. Edit `agenteval.config.json`:

```json
{
  "agent": {
    "endpoint": "http://localhost:3000/api/chat",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer ${AGENT_API_KEY}"
    }
  }
}
```

Key elements:
- `endpoint` - Where your agent lives
- `headers` - Auth tokens, API keys (use env vars)
- `method` - Usually POST for chat agents

Environment variables are interpolated at runtime. Keep secrets out of config files.

## 3. Write Your First Test Case

Test cases live in `evals/`. Create `evals/basic.json`:

```json
{
  "name": "basic-math",
  "prompt": "What is 2 + 2?",
  "expected": {
    "contains": "4"
  }
}
```

This sends the prompt to your agent and checks if the response contains "4".

You can also use:
- `equals` - Exact match
- `regex` - Pattern match
- `llm-judge` - Have another LLM grade the response

Start simple. Add complexity as you learn what breaks.

## 4. Run Your First Eval

```bash
npx agenteval run
```

Agent Lab will:
1. Load all test cases from `evals/`
2. Send each prompt to your agent
3. Check responses against expected outcomes
4. Output pass/fail with timing data

You'll see output like:

```
✓ basic-math (234ms)
✗ complex-reasoning (1.2s) - expected "Paris", got "France"

2 tests, 1 passed, 1 failed
```

## 5. Add Grading with LLM Judge

For open-ended responses, exact matching doesn't work. Use an LLM to grade:

```json
{
  "name": "explanation-quality",
  "prompt": "Explain quantum entanglement to a 10-year-old",
  "expected": {
    "llm-judge": {
      "criteria": "Response is accurate, uses simple language, includes a relatable analogy"
    }
  }
}
```

The judge LLM scores 0-100 based on your criteria. You set the pass threshold.

## 6. Run Multiple Trials

Agents are non-deterministic. One pass doesn't mean reliability. Run multiple trials:

```bash
npx agenteval run --trials 5
```

This runs each test case 5 times and reports:
- Pass rate per test
- Average response time
- Token usage stats

A test that passes 3/5 times tells you something different than 5/5.

## 7. View Results in the Dashboard

For deeper analysis, launch the web UI:

```bash
npx agenteval dashboard
```

Open `http://localhost:3737`. You'll see:
- Historical pass rates over time
- Side-by-side response comparisons
- Cost breakdowns per eval run
- Failure patterns and common error modes

## Make It Your Own

Agent Lab is just a test runner. The power is in how you use it.

**Regression suites** - Build a golden set of test cases. Run on every deploy. Block releases that regress.

**Prompt iteration** - A/B test prompts. Same test cases, different system prompts. Compare pass rates.

**Model comparison** - Point at GPT-4, Claude, Llama. Same tests. See which model handles your use case best.

**CI integration** - Add to your GitHub Actions. Fail the build if pass rate drops below threshold.

```yaml
- name: Run agent evals
  run: npx agenteval run --threshold 0.9
```

**Custom graders** - Write JavaScript functions for domain-specific evaluation. Check JSON schema compliance. Validate code execution. Score retrieval relevance.

Any task that fits "send prompt, check response" works with Agent Lab.

---

Next: [Writing Effective Test Cases](/docs/test-cases) | [LLM Judge Configuration](/docs/llm-judge)
