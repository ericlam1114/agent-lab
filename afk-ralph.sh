#!/bin/bash
# AFK Ralph Loop for Agent Evals Framework
# Usage: ./afk-ralph.sh <iterations>
# Run inside Docker sandbox: docker sandbox run claude ./afk-ralph.sh 50

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  echo "Example: ./afk-ralph.sh 50"
  exit 1
fi

ITERATIONS=$1
PRD_FILE="agent-evals/.memory/PRD.md"
PROGRESS_FILE="agent-evals/.memory/progress.txt"

echo "Starting AFK Ralph loop with $ITERATIONS iterations..."
echo "PRD: $PRD_FILE"
echo "Progress: $PROGRESS_FILE"
echo "---"

for ((i=1; i<=$ITERATIONS; i++)); do
  echo ""
  echo "=== Iteration $i of $ITERATIONS ==="
  echo "$(date)"
  echo ""

  result=$(claude --permission-mode acceptEdits -p "@$PRD_FILE @$PROGRESS_FILE
You are implementing the Agent Evals Framework using a Ralph Wiggum loop.

1. Read the PRD.md and progress.txt files carefully.
2. Find the NEXT task with passes: false (go in order by ID).
3. Implement that ONE task completely:
   - Create/edit the necessary files
   - Follow TypeScript best practices
   - Use existing patterns in the codebase
4. Run feedback loops:
   - npm run build (must pass)
   - npm run lint (must pass)
   - npm test (if tests exist, must pass)
5. Update the PRD.md: set passes: true for the completed task.
6. Append to progress.txt:
   - Task ID and description
   - Key decisions made
   - Files created/modified
   - Any notes for next iteration
7. Make a git commit with descriptive message.

CRITICAL RULES:
- ONLY work on ONE task per iteration
- Do NOT skip tasks - do them in ID order
- Do NOT mark a task as passed unless fully complete
- Run build/lint/test BEFORE committing
- Keep changes focused and minimal

If ALL tasks have passes: true, output exactly: <promise>COMPLETE</promise>

After completing the 40 tasks, deploy 8 subagents for validation:
- 3 unit test subagents
- 3 browser test subagents
- 2 security scanner subagents
Fix any failures they find, then output: <promise>COMPLETE</promise>
")

  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo ""
    echo "=== PRD COMPLETE ==="
    echo "Finished after $i iterations."
    echo "$(date)"
    exit 0
  fi
done

echo ""
echo "=== MAX ITERATIONS REACHED ==="
echo "Completed $ITERATIONS iterations without finishing PRD."
echo "Run again to continue: ./afk-ralph.sh <more-iterations>"
