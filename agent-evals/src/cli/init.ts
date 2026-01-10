/**
 * agenteval init command
 * Interactive initialization for creating eval config files
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Simple prompt function using readline
async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const displayQuestion = defaultValue
      ? `${question} [${defaultValue}]: `
      : `${question}: `;

    rl.question(displayQuestion, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

// Agent type templates
const agentTypeTemplates: Record<string, string> = {
  coding: `# Coding Agent Evaluation Config
name: {{NAME}}
description: Evaluate coding agent capabilities

agent:
  type: coding
  endpoint: {{ENDPOINT}}
  timeout: 120000

settings:
  concurrency: 2
  trialsPerTask: 3

tasks:
  - id: task-1
    type: code-generation
    description: Generate a function to calculate factorial
    input:
      prompt: "Write a TypeScript function that calculates the factorial of a number"
    graders:
      - type: test-runner
        command: npm test
        testPattern: "factorial"
      - type: llm-rubric
        rubric: |
          Evaluate the code quality:
          1. Correctness (0-1): Does it handle edge cases?
          2. Readability (0-1): Is the code clean and well-structured?
          3. Efficiency (0-1): Is the algorithm efficient?
`,

  conversational: `# Conversational Agent Evaluation Config
name: {{NAME}}
description: Evaluate conversational agent capabilities

agent:
  type: conversational
  endpoint: {{ENDPOINT}}
  timeout: 60000

settings:
  concurrency: 1
  trialsPerTask: 3
  maxTurns: 10

tasks:
  - id: task-1
    type: conversation
    description: Handle customer support inquiry
    input:
      initialMessage: "I need help resetting my password"
      userPersona: "A frustrated user who has tried resetting multiple times"
    graders:
      - type: llm-rubric
        rubric: |
          Evaluate the conversation:
          1. Empathy (0-1): Did the agent acknowledge user frustration?
          2. Helpfulness (0-1): Did the agent provide clear steps?
          3. Resolution (0-1): Was the issue resolved?
`,

  research: `# Research Agent Evaluation Config
name: {{NAME}}
description: Evaluate research agent capabilities

agent:
  type: research
  endpoint: {{ENDPOINT}}
  timeout: 180000

settings:
  concurrency: 1
  trialsPerTask: 3

tasks:
  - id: task-1
    type: research
    description: Research a topic and provide summary
    input:
      query: "What are the key benefits of TypeScript over JavaScript?"
    graders:
      - type: factuality
        source: "TypeScript documentation and official resources"
      - type: llm-rubric
        rubric: |
          Evaluate the research output:
          1. Accuracy (0-1): Are the facts correct?
          2. Completeness (0-1): Are key points covered?
          3. Source quality (0-1): Are sources authoritative?
`,

  'computer-use': `# Computer Use Agent Evaluation Config
name: {{NAME}}
description: Evaluate computer use agent capabilities

agent:
  type: computer-use
  endpoint: {{ENDPOINT}}
  timeout: 300000

settings:
  concurrency: 1
  trialsPerTask: 3

tasks:
  - id: task-1
    type: browser-automation
    description: Navigate to website and fill form
    input:
      url: "https://example.com/form"
      instructions: "Fill out the contact form with test data"
    graders:
      - type: state-check
        checks:
          - type: api
            url: "https://example.com/api/submissions"
            method: GET
            expect:
              status: 200
      - type: llm-rubric
        rubric: |
          Evaluate the task completion:
          1. Success (0-1): Was the form submitted?
          2. Accuracy (0-1): Were fields filled correctly?
`,
};

export const initCommand = new Command('init')
  .description('Initialize a new agent evaluation config')
  .option('-n, --name <name>', 'Name for the evaluation')
  .option('-t, --type <type>', 'Agent type (coding, conversational, research, computer-use)')
  .option('-e, --endpoint <url>', 'Agent API endpoint')
  .option('--non-interactive', 'Use defaults without prompting')
  .action(async (options) => {
    console.log('\n🔧 Agent Eval Initialization\n');

    let name = options.name;
    let agentType = options.type;
    let endpoint = options.endpoint;

    if (!options.nonInteractive) {
      // Interactive prompts
      if (!name) {
        name = await prompt('Evaluation name', 'my-agent-eval');
      }

      if (!agentType) {
        console.log('\nAvailable agent types:');
        console.log('  1. coding          - Code generation/modification agents');
        console.log('  2. conversational  - Chat/support agents');
        console.log('  3. research        - Information gathering agents');
        console.log('  4. computer-use    - Browser/desktop automation agents\n');

        const typeChoice = await prompt('Agent type (1-4 or name)', 'coding');
        const typeMap: Record<string, string> = {
          '1': 'coding',
          '2': 'conversational',
          '3': 'research',
          '4': 'computer-use',
        };
        agentType = typeMap[typeChoice] || typeChoice;
      }

      if (!endpoint) {
        endpoint = await prompt('Agent API endpoint', 'http://localhost:3000/api/agent');
      }
    } else {
      // Use defaults
      name = name || 'my-agent-eval';
      agentType = agentType || 'coding';
      endpoint = endpoint || 'http://localhost:3000/api/agent';
    }

    // Validate agent type
    if (!agentTypeTemplates[agentType]) {
      console.error(`\n❌ Unknown agent type: ${agentType}`);
      console.error('Valid types: coding, conversational, research, computer-use');
      process.exit(1);
    }

    // Generate config from template
    let config = agentTypeTemplates[agentType];
    config = config.replace(/\{\{NAME\}\}/g, name);
    config = config.replace(/\{\{ENDPOINT\}\}/g, endpoint);

    // Create .agentevals directory if it doesn't exist
    const evalsDir = path.join(process.cwd(), '.agentevals');
    if (!fs.existsSync(evalsDir)) {
      fs.mkdirSync(evalsDir, { recursive: true });
      console.log(`\n📁 Created .agentevals directory`);
    }

    // Write config file
    const configPath = path.join(process.cwd(), 'agenteval.yaml');
    fs.writeFileSync(configPath, config);
    console.log(`\n✅ Created config file: ${configPath}`);

    // Create sample grader configs directory
    const graderDir = path.join(evalsDir, 'graders');
    if (!fs.existsSync(graderDir)) {
      fs.mkdirSync(graderDir, { recursive: true });
    }

    // Write sample custom grader
    const sampleGrader = `/**
 * Sample custom grader
 * Export a function that returns a GraderResult
 */

export interface GraderResult {
  graderId: string;
  graderType: string;
  passed: boolean;
  score: number;
  details?: string;
}

export async function customGrader(
  output: string,
  _expected?: string
): Promise<GraderResult> {
  // Implement your custom grading logic here
  const passed = output.length > 0;

  return {
    graderId: 'custom-grader',
    graderType: 'custom',
    passed,
    score: passed ? 1 : 0,
    details: \`Output length: \${output.length}\`,
  };
}
`;

    fs.writeFileSync(path.join(graderDir, 'sample-grader.ts'), sampleGrader);
    console.log(`📁 Created sample grader: .agentevals/graders/sample-grader.ts`);

    console.log('\n🎉 Initialization complete!\n');
    console.log('Next steps:');
    console.log('  1. Edit agenteval.yaml to configure your tasks');
    console.log('  2. Run: agenteval run');
    console.log('  3. View results: agenteval view\n');
  });
