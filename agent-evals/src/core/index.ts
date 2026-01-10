/**
 * Core evaluation engine exports
 */

// Task Runner
export {
  TaskRunner,
  TaskError,
  TaskTimeoutError,
  TaskExecutionError,
  createTaskRunner,
  type TaskResult,
  type TaskMetrics,
  type TaskErrorInfo,
} from './task-runner';

// Transcript
export {
  Transcript,
  type MessageRole,
  type TranscriptMessage,
  type ToolCallRecord,
  type ToolResultRecord,
  type TranscriptData,
} from './transcript';

// Evaluator
export {
  Evaluator,
  createEvaluator,
  runEvaluation,
  type EvaluatorConfig,
  type EvaluatorResult,
  type TaskEvalResult,
  type EvalProgress,
  type ProgressCallback,
} from './evaluator';

// Trial Manager
export {
  TrialManager,
  createTrialManager,
  calculatePassAtK,
  calculatePassToTheK,
  type TrialManagerConfig,
  type TrialResult,
  type TaskTrialResults,
  type TrialCallback,
} from './trial-manager';
