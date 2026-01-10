/**
 * Human Review Queue
 * Manages human grading queue for trials
 */

import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '../../db';
import { humanReviews, results } from '../../db/schema';
import type { GraderResult, GraderType } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface HumanReviewConfig {
  graderId?: string;
  instructions?: string;
  rubric?: string;
  minScore?: number;
  maxScore?: number;
}

export interface HumanReview {
  id: string;
  trialId: string;
  graderId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assignedTo?: string;
  score?: number;
  feedback?: string;
  createdAt: Date;
  assignedAt?: Date;
  completedAt?: Date;
}

export interface HumanReviewSubmission {
  score: number;
  feedback?: string;
  reviewerId?: string;
}

export interface HumanReviewListOptions {
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assignedTo?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Human Review Queue Class
// ============================================================================

export class HumanReviewQueue {
  private config: HumanReviewConfig;

  constructor(config: HumanReviewConfig = {}) {
    this.config = {
      graderId: config.graderId ?? 'human-review',
      instructions: config.instructions,
      rubric: config.rubric,
      minScore: config.minScore ?? 0,
      maxScore: config.maxScore ?? 1,
    };
  }

  /**
   * Queue a trial for human review
   */
  async queueForReview(trialId: string): Promise<HumanReview> {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.insert(humanReviews).values({
      id,
      trialId,
      graderId: this.config.graderId!,
      status: 'pending',
      createdAt: now,
    });

    return {
      id,
      trialId,
      graderId: this.config.graderId!,
      status: 'pending',
      createdAt: new Date(now),
    };
  }

  /**
   * List reviews (with optional filters)
   */
  async listReviews(options: HumanReviewListOptions = {}): Promise<HumanReview[]> {
    const db = getDb();

    let query = db.select().from(humanReviews);

    // Build conditions
    const conditions = [];

    if (options.status) {
      conditions.push(eq(humanReviews.status, options.status));
    }

    if (options.assignedTo) {
      conditions.push(eq(humanReviews.assignedTo, options.assignedTo));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    if (options.limit) {
      query = query.limit(options.limit) as typeof query;
    }

    if (options.offset) {
      query = query.offset(options.offset) as typeof query;
    }

    const rows = await query;

    return rows.map((row) => ({
      id: row.id,
      trialId: row.trialId,
      graderId: row.graderId,
      status: row.status as HumanReview['status'],
      assignedTo: row.assignedTo ?? undefined,
      score: row.score ?? undefined,
      feedback: row.feedback ?? undefined,
      createdAt: new Date(row.createdAt),
      assignedAt: row.assignedAt ? new Date(row.assignedAt) : undefined,
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
    }));
  }

  /**
   * Get pending reviews count
   */
  async getPendingCount(): Promise<number> {
    const reviews = await this.listReviews({ status: 'pending' });
    return reviews.length;
  }

  /**
   * Assign a review to a reviewer
   */
  async assignReview(reviewId: string, reviewerId: string): Promise<HumanReview | null> {
    const db = getDb();
    const now = new Date().toISOString();

    await db
      .update(humanReviews)
      .set({
        status: 'in_progress',
        assignedTo: reviewerId,
        assignedAt: now,
      })
      .where(eq(humanReviews.id, reviewId));

    const reviews = await this.listReviews();
    return reviews.find((r) => r.id === reviewId) ?? null;
  }

  /**
   * Submit a review
   */
  async submitReview(
    reviewId: string,
    submission: HumanReviewSubmission
  ): Promise<GraderResult> {
    const db = getDb();
    const now = new Date().toISOString();

    // Normalize score to 0-1 range
    const { minScore, maxScore } = this.config;
    const normalizedScore =
      minScore !== undefined && maxScore !== undefined
        ? (submission.score - minScore) / (maxScore - minScore)
        : submission.score;

    // Update review record
    await db
      .update(humanReviews)
      .set({
        status: 'completed',
        score: normalizedScore,
        feedback: submission.feedback,
        assignedTo: submission.reviewerId,
        completedAt: now,
      })
      .where(eq(humanReviews.id, reviewId));

    // Get the review to find trial ID
    const reviews = await this.listReviews();
    const review = reviews.find((r) => r.id === reviewId);

    if (review) {
      // Create grader result in results table
      await db.insert(results).values({
        id: uuidv4(),
        trialId: review.trialId,
        graderId: this.config.graderId!,
        graderType: 'human-review',
        score: normalizedScore,
        passed: normalizedScore >= 0.5,
        details: submission.feedback,
        createdAt: now,
      });
    }

    // Return grader result
    const passed = normalizedScore >= 0.5;
    return {
      graderId: this.config.graderId!,
      graderType: 'human-review' as GraderType,
      passed,
      score: normalizedScore,
      details: submission.feedback || 'Human review completed',
    };
  }

  /**
   * Skip a review
   */
  async skipReview(reviewId: string, reason?: string): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    await db
      .update(humanReviews)
      .set({
        status: 'skipped',
        feedback: reason,
        completedAt: now,
      })
      .where(eq(humanReviews.id, reviewId));
  }

  /**
   * Get review by ID
   */
  async getReview(reviewId: string): Promise<HumanReview | null> {
    const reviews = await this.listReviews();
    return reviews.find((r) => r.id === reviewId) ?? null;
  }

  /**
   * Get reviews for a specific trial
   */
  async getReviewsForTrial(trialId: string): Promise<HumanReview[]> {
    const db = getDb();

    const rows = await db
      .select()
      .from(humanReviews)
      .where(eq(humanReviews.trialId, trialId));

    return rows.map((row) => ({
      id: row.id,
      trialId: row.trialId,
      graderId: row.graderId,
      status: row.status as HumanReview['status'],
      assignedTo: row.assignedTo ?? undefined,
      score: row.score ?? undefined,
      feedback: row.feedback ?? undefined,
      createdAt: new Date(row.createdAt),
      assignedAt: row.assignedAt ? new Date(row.assignedAt) : undefined,
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
    }));
  }

  /**
   * Get next pending review (for auto-assignment)
   */
  async getNextPending(): Promise<HumanReview | null> {
    const db = getDb();

    const rows = await db
      .select()
      .from(humanReviews)
      .where(and(eq(humanReviews.status, 'pending'), isNull(humanReviews.assignedTo)))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      trialId: row.trialId,
      graderId: row.graderId,
      status: row.status as HumanReview['status'],
      createdAt: new Date(row.createdAt),
    };
  }

  /**
   * Get config
   */
  getConfig(): HumanReviewConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a human review queue
 */
export function createHumanReviewQueue(config?: HumanReviewConfig): HumanReviewQueue {
  return new HumanReviewQueue(config);
}

/**
 * Human review grader - queues for review and returns pending result
 */
export async function humanReviewGrader(
  trialId: string,
  config?: HumanReviewConfig
): Promise<GraderResult> {
  const queue = createHumanReviewQueue(config);
  const review = await queue.queueForReview(trialId);

  return {
    graderId: config?.graderId ?? 'human-review',
    graderType: 'human-review' as GraderType,
    passed: false, // Pending until reviewed
    score: 0,
    details: `Queued for human review (ID: ${review.id})`,
  };
}
