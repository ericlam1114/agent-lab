#!/bin/bash
# Human-in-the-loop Ralph - Single iteration
# Usage: ./ralph-once.sh
# Watch what it does, then run again

PRD_FILE="agent-evals/.memory/PRD.md"
PROGRESS_FILE="agent-evals/.memory/progress.txt"

echo "Running single Ralph iteration..."
echo "PRD: $PRD_FILE"
echo "Progress: $PROGRESS_FILE"
echo "---"

claude --permission-mode acceptEdits "@$PRD_FILE @$PROGRESS_FILE
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
"

echo ""
echo "---"
echo "Single iteration complete. Review the changes, then run again."
