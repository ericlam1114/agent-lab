/**
 * Conversational Agent Evaluator
 * Specialized evaluation for conversational/chatbot agents
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { GraderResult } from '../types';
import { llmRubricGrader, type LLMRubricConfig } from '../graders/model-based/llm-rubric';

// ============================================================================
// Types
// ============================================================================

export interface ConversationalAgentConfig {
  maxTurns?: number;
  userPersona?: string;
  toneRubric?: string;
  resolutionCriteria?: string;
  provider?: 'openai' | 'anthropic';
  model?: string;
}

export interface ConversationalAgentResult {
  turnLimitResult?: GraderResult;
  toneResult?: GraderResult;
  resolutionResult?: GraderResult;
  conversationQuality?: GraderResult;
  overallScore: number;
  passed: boolean;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

// ============================================================================
// Default Rubrics
// ============================================================================

const DEFAULT_TONE_RUBRIC = `Evaluate the assistant's responses for tone and professionalism:

1. Empathy (0-1): Does the assistant acknowledge user concerns appropriately?
2. Professionalism (0-1): Is the language appropriate and respectful?
3. Clarity (0-1): Are responses clear and easy to understand?
4. Helpfulness (0-1): Does the assistant provide useful, relevant information?

Provide an overall score from 0 to 1.`;

const DEFAULT_RESOLUTION_RUBRIC = `Evaluate whether the conversation successfully resolved the user's request:

1. Task Completion (0-1): Was the user's main request fulfilled?
2. Accuracy (0-1): Was the information/action provided correct?
3. User Satisfaction (0-1): Would a reasonable user be satisfied with this outcome?

Provide an overall score from 0 to 1.`;

const DEFAULT_USER_PERSONA = `You are a typical user seeking help. Be reasonable but occasionally ask follow-up questions.`;

// ============================================================================
// User Simulator
// ============================================================================

export class UserSimulator {
  private persona: string;
  private provider: 'openai' | 'anthropic';
  private model?: string;

  constructor(
    persona: string = DEFAULT_USER_PERSONA,
    provider: 'openai' | 'anthropic' = 'openai',
    model?: string
  ) {
    this.persona = persona;
    this.provider = provider;
    this.model = model;
  }

  /**
   * Generate a user response based on conversation history
   */
  async generateResponse(
    conversation: ConversationTurn[],
    context?: string
  ): Promise<string> {
    const systemPrompt = `${this.persona}

You are simulating a user in a conversation with an AI assistant.
Based on the conversation so far, respond as the user would.
Keep responses natural and concise.
If the task seems complete, you can say something like "Thanks, that's all I needed."`;

    const conversationHistory = conversation
      .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
      .join('\n\n');

    const prompt = context
      ? `Context: ${context}\n\nConversation:\n${conversationHistory}\n\nRespond as the user:`
      : `Conversation:\n${conversationHistory}\n\nRespond as the user:`;

    if (this.provider === 'anthropic') {
      const anthropic = new Anthropic();
      const response = await anthropic.messages.create({
        model: this.model || 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });
      const content = response.content[0];
      return content.type === 'text' ? content.text : '';
    }

    const openai = new OpenAI();
    const response = await openai.chat.completions.create({
      model: this.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content || '';
  }
}

// ============================================================================
// Conversational Agent Evaluator
// ============================================================================

export class ConversationalAgentEvaluator {
  private config: ConversationalAgentConfig;
  private userSimulator: UserSimulator;

  constructor(config: ConversationalAgentConfig = {}) {
    this.config = {
      maxTurns: config.maxTurns ?? 10,
      userPersona: config.userPersona ?? DEFAULT_USER_PERSONA,
      toneRubric: config.toneRubric ?? DEFAULT_TONE_RUBRIC,
      resolutionCriteria: config.resolutionCriteria ?? DEFAULT_RESOLUTION_RUBRIC,
      provider: config.provider ?? 'openai',
      model: config.model,
    };

    this.userSimulator = new UserSimulator(
      this.config.userPersona,
      this.config.provider,
      this.config.model
    );
  }

  /**
   * Evaluate a conversation
   */
  async evaluate(conversation: ConversationTurn[]): Promise<ConversationalAgentResult> {
    const results: ConversationalAgentResult = {
      overallScore: 0,
      passed: false,
    };

    const graderResults: GraderResult[] = [];

    // Check turn limit
    results.turnLimitResult = this.checkTurnLimit(conversation);
    graderResults.push(results.turnLimitResult);

    // Analyze tone
    results.toneResult = await this.analyzeTone(conversation);
    graderResults.push(results.toneResult);

    // Check resolution
    results.resolutionResult = await this.checkResolution(conversation);
    graderResults.push(results.resolutionResult);

    // Overall conversation quality
    results.conversationQuality = await this.analyzeConversationQuality(conversation);
    graderResults.push(results.conversationQuality);

    // Calculate overall score
    const sum = graderResults.reduce((acc, r) => acc + r.score, 0);
    results.overallScore = sum / graderResults.length;
    results.passed = results.overallScore >= 0.5;

    return results;
  }

  /**
   * Check if conversation stayed within turn limit
   */
  checkTurnLimit(conversation: ConversationTurn[]): GraderResult {
    const maxTurns = this.config.maxTurns!;
    const turnCount = conversation.length;
    const withinLimit = turnCount <= maxTurns * 2; // Each turn has user + assistant

    return {
      graderId: 'turn-limit',
      graderType: 'state-check',
      passed: withinLimit,
      score: withinLimit ? 1 : Math.max(0, 1 - (turnCount - maxTurns * 2) / maxTurns),
      details: `${turnCount} messages (limit: ${maxTurns * 2})`,
    };
  }

  /**
   * Analyze tone using LLM rubric
   */
  async analyzeTone(conversation: ConversationTurn[]): Promise<GraderResult> {
    const assistantResponses = conversation
      .filter((turn) => turn.role === 'assistant')
      .map((turn) => turn.content)
      .join('\n\n---\n\n');

    const config: LLMRubricConfig = {
      rubric: this.config.toneRubric!,
      provider: this.config.provider,
      model: this.config.model,
    };

    return llmRubricGrader(assistantResponses, config, 'tone-analysis');
  }

  /**
   * Check if conversation resolved the user's request
   */
  async checkResolution(conversation: ConversationTurn[]): Promise<GraderResult> {
    const conversationText = conversation
      .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
      .join('\n\n');

    const config: LLMRubricConfig = {
      rubric: this.config.resolutionCriteria!,
      provider: this.config.provider,
      model: this.config.model,
    };

    return llmRubricGrader(conversationText, config, 'resolution');
  }

  /**
   * Analyze overall conversation quality
   */
  async analyzeConversationQuality(
    conversation: ConversationTurn[]
  ): Promise<GraderResult> {
    const conversationText = conversation
      .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
      .join('\n\n');

    const rubric = `Evaluate the overall quality of this conversation:

1. Flow (0-1): Does the conversation flow naturally?
2. Relevance (0-1): Are responses relevant to the context?
3. Consistency (0-1): Is the assistant consistent in its responses?
4. Engagement (0-1): Is the conversation engaging and helpful?

Provide an overall score from 0 to 1.`;

    const config: LLMRubricConfig = {
      rubric,
      provider: this.config.provider,
      model: this.config.model,
    };

    return llmRubricGrader(conversationText, config, 'conversation-quality');
  }

  /**
   * Get user simulator for running conversations
   */
  getUserSimulator(): UserSimulator {
    return this.userSimulator;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createConversationalAgentEvaluator(
  config?: ConversationalAgentConfig
): ConversationalAgentEvaluator {
  return new ConversationalAgentEvaluator(config);
}
