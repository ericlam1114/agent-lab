/**
 * Model-based (LLM) graders
 */

// LLM Rubric Grader
export {
  evaluateWithRubric,
  llmRubricGrader,
  createLLMRubricGrader,
  clearCache as clearRubricCache,
  type LLMRubricConfig,
  type RubricDimension,
  type LLMRubricResult,
} from './llm-rubric';

// Factuality Grader
export {
  checkFactuality,
  factualityGrader,
  createFactualityGrader,
  type FactualityConfig,
  type Claim,
  type FactualityResult,
} from './factuality';

// Similarity Grader
export {
  calculateSemanticSimilarity,
  similarityGrader,
  createSimilarityGrader,
  calculateBestSimilarity,
  cosineSimilarity,
  euclideanDistance,
  distanceToSimilarity,
  clearEmbeddingCache,
  type SimilarityConfig,
  type SimilarityResult,
} from './similarity';
