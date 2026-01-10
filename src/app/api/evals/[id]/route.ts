/**
 * API Route: /api/evals/[id]
 * Get a specific evaluation with details
 */

import { NextResponse } from 'next/server';
import { getDb } from '../../../../../agent-evals/src/db';
import { evals, tasks, trials, results } from '../../../../../agent-evals/src/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    // Get eval
    const evalResults = await db.select().from(evals).where(eq(evals.id, id));

    if (evalResults.length === 0) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });
    }

    const evalData = evalResults[0];

    // Get tasks
    const taskList = await db.select().from(tasks).where(eq(tasks.evalId, id));

    // Get trials for each task
    const tasksWithTrials = await Promise.all(
      taskList.map(async (task) => {
        const taskTrials = await db
          .select()
          .from(trials)
          .where(eq(trials.taskId, task.id));

        // Get results for each trial
        const trialsWithResults = await Promise.all(
          taskTrials.map(async (trial) => {
            const trialResults = await db
              .select()
              .from(results)
              .where(eq(results.trialId, trial.id));

            return {
              ...trial,
              graderResults: trialResults,
            };
          })
        );

        return {
          ...task,
          trials: trialsWithResults,
        };
      })
    );

    // Calculate aggregate metrics
    const totalTrials = tasksWithTrials.reduce((sum, t) => sum + t.trials.length, 0);
    const passedTrials = tasksWithTrials.reduce(
      (sum, t) => sum + t.trials.filter((tr) => tr.passed).length,
      0
    );
    const avgLatency =
      totalTrials > 0
        ? tasksWithTrials.reduce(
            (sum, t) => sum + t.trials.reduce((s, tr) => s + (tr.latencyMs || 0), 0),
            0
          ) / totalTrials
        : 0;

    return NextResponse.json({
      eval: evalData,
      tasks: tasksWithTrials,
      metrics: {
        totalTasks: taskList.length,
        totalTrials,
        passedTrials,
        passRate: totalTrials > 0 ? passedTrials / totalTrials : 0,
        avgLatencyMs: avgLatency,
      },
    });
  } catch (error) {
    console.error('Error fetching eval:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    // Delete in order: results -> trials -> tasks -> eval
    const taskList = await db.select().from(tasks).where(eq(tasks.evalId, id));

    for (const task of taskList) {
      const taskTrials = await db
        .select()
        .from(trials)
        .where(eq(trials.taskId, task.id));

      for (const trial of taskTrials) {
        await db.delete(results).where(eq(results.trialId, trial.id));
      }

      await db.delete(trials).where(eq(trials.taskId, task.id));
    }

    await db.delete(tasks).where(eq(tasks.evalId, id));
    await db.delete(evals).where(eq(evals.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting eval:', error);
    return NextResponse.json(
      { error: 'Failed to delete evaluation' },
      { status: 500 }
    );
  }
}
