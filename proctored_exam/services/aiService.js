// services/aiService.js
const Question = require('../models/question');
const Attempt = require('../models/attempt');
const User = require('../models/user');
const _ = require('lodash');

/**
 * Select adaptive questions based on user performance
 * @param {string} userId - User ID
 * @param {string} certificationId - Certification ID
 * @param {number} questionCount - Number of questions to select
 * @returns {Array} - Selected questions
 */
exports.selectAdaptiveQuestions = async (userId, certificationId, questionCount) => {
  try {
    // Get user's previous attempts for this certification
    const previousAttempts = await Attempt.find({
      userId,
      certificationId,
      completed: true
    }).sort({ createdAt: -1 }).limit(5);
    
    // If user has no previous attempts, return random questions
    if (previousAttempts.length === 0) {
      return getRandomQuestions(certificationId, questionCount);
    }
    
    // Analyze user performance by domain
    const domainPerformance = analyzeUserDomainPerformance(previousAttempts);
    
    // Calculate question distribution based on weak areas
    const distribution = calculateQuestionDistribution(
      domainPerformance,
      questionCount
    );
    
    // Select questions according to distribution and difficulty
    const selectedQuestions = await selectQuestionsPerDomain(
      certificationId,
      distribution,
      domainPerformance
    );
    
    return selectedQuestions;
  } catch (err) {
    console.error('Error selecting adaptive questions:', err);
    // Fallback to random questions
    return getRandomQuestions(certificationId, questionCount);
  }
};

/**
 * Get random questions as fallback
 * @param {string} certificationId - Certification ID
 * @param {number} count - Number of questions
 * @returns {Array} - Random questions
 */
async function getRandomQuestions(certificationId, count) {
  return await Question.aggregate([
    { $match: { certificationId, active: true } },
    { $sample: { size: count } }
  ]);
}

/**
 * Analyze user performance by domain
 * @param {Array} attempts - Previous exam attempts
 * @returns {Object} - Domain performance analysis
 */
function analyzeUserDomainPerformance(attempts) {
  // Collect all questions across attempts
  const allQuestions = attempts.flatMap(attempt => attempt.questions);
  
  // Group questions by domain
  const questionsByDomain = _.groupBy(allQuestions, 'domain');
  
  // Calculate performance metrics by domain
  const domainPerformance = {};
  
  for (const [domain, questions] of Object.entries(questionsByDomain)) {
    const totalQuestions = questions.length;
    const correctQuestions = questions.filter(q => q.correct).length;
    const avgTimeSpent = _.meanBy(questions, 'timeSpent');
    
    domainPerformance[domain] = {
      totalQuestions,
      correctQuestions,
      correctPercentage: (correctQuestions / totalQuestions) * 100,
      avgTimeSpent,
      weaknessScore: calculateWeaknessScore(
        correctQuestions / totalQuestions,
        avgTimeSpent,
        questions.length
      )
    };
  }
  
  return domainPerformance;
}

/**
 * Calculate weakness score (higher means weaker area)
 * @param {number} correctRatio - Ratio of correct answers
 * @param {number} avgTimeSpent - Average time spent per question
 * @param {number} sampleSize - Number of questions
 * @returns {number} - Weakness score
 */
function calculateWeaknessScore(correctRatio, avgTimeSpent, sampleSize) {
  // Base score from correct ratio (inverted, so lower performance = higher score)
  const baseScore = 1 - correctRatio;
  
  // Time factor (normalize time spent, longer time indicates struggle)
  const timeFactor = Math.min(1, avgTimeSpent / 120); // Cap at 2 minutes
  
  // Sample size weight (more confidence with more questions)
  const sampleWeight = Math.min(1, sampleSize / 20);
  
  // Combined score with time as a secondary factor
  const rawScore = (baseScore * 0.7) + (timeFactor * 0.3);
  
  // Apply sample weight (more samples = more confidence in score)
  return rawScore * sampleWeight;
}

/**
 * Calculate distribution of questions based on domain weakness
 * @param {Object} domainPerformance - Performance by domain
 * @param {number} totalQuestions - Total questions to select
 * @returns {Object} - Distribution of questions by domain
 */
function calculateQuestionDistribution(domainPerformance, totalQuestions) {
  // Calculate total weakness score
  const domains = Object.keys(domainPerformance);
  const totalWeaknessScore = _.sumBy(
    domains,
    domain => domainPerformance[domain].weaknessScore
  );
  
  // Distribute questions proportionally to weakness
  const rawDistribution = {};
  
  for (const domain of domains) {
    const weaknessRatio = domainPerformance[domain].weaknessScore / totalWeaknessScore;
    rawDistribution[domain] = Math.round(totalQuestions * weaknessRatio);
  }
  
  // Ensure minimum questions per domain and adjust to match total
  const distribution = ensureMinimumQuestions(rawDistribution, totalQuestions);
  
  return distribution;
}

/**
 * Ensure each domain has minimum questions and total matches
 * @param {Object} distribution - Initial distribution
 * @param {number} totalQuestions - Target total
 * @returns {Object} - Adjusted distribution
 */
function ensureMinimumQuestions(distribution, totalQuestions) {
  const domains = Object.keys(distribution);
  const minPerDomain = Math.max(1, Math.floor(totalQuestions * 0.1));
  
  // Ensure minimum per domain
  let adjusted = {};
  for (const domain of domains) {
    adjusted[domain] = Math.max(minPerDomain, distribution[domain]);
  }
  
  // Adjust to match total
  let currentTotal = _.sum(Object.values(adjusted));
  
  if (currentTotal > totalQuestions) {
    // Reduce from domains with most questions
    while (currentTotal > totalQuestions) {
      const maxDomain = _.maxBy(Object.keys(adjusted), d => adjusted[d]);
      if (adjusted[maxDomain] > minPerDomain) {
        adjusted[maxDomain]--;
        currentTotal--;
      } else {
        break; // Can't reduce further without violating minimum
      }
    }
  } else if (currentTotal < totalQuestions) {
    // Add to domains with highest weakness
    while (currentTotal < totalQuestions) {
      const domainsByWeakness = _.sortBy(domains, d => -distribution[d]);
      adjusted[domainsByWeakness[0]]++;
      currentTotal++;
    }
  }
  
  return adjusted;
}

/**
 * Select questions for each domain according to distribution
 * @param {string} certificationId - Certification ID
 * @param {Object} distribution - Question distribution by domain
 * @param {Object} domainPerformance - Performance by domain
 * @returns {Array} - Selected questions
 */
async function selectQuestionsPerDomain(certificationId, distribution, domainPerformance) {
  let selectedQuestions = [];
  
  for (const [domain, count] of Object.entries(distribution)) {
    if (count <= 0) continue;
    
    // Determine difficulty target based on performance
    const performance = domainPerformance[domain] || { correctPercentage: 50 };
    const difficultyTarget = calculateTargetDifficulty(performance.correctPercentage);
    
    // Query questions with appropriate difficulty
    const domainQuestions = await selectDomainQuestions(
      certificationId,
      domain,
      count,
      difficultyTarget
    );
    
    selectedQuestions = [...selectedQuestions, ...domainQuestions];
  }
  
  return selectedQuestions;
}

/**
 * Calculate target difficulty level based on performance
 * @param {number} correctPercentage - Percentage of correct answers
 * @returns {Object} - Target difficulty range
 */
function calculateTargetDifficulty(correctPercentage) {
  // Scale: 1-5 where 5 is hardest
  let baseDifficulty;
  
  if (correctPercentage >= 90) {
    baseDifficulty = 5; // Very challenging
  } else if (correctPercentage >= 80) {
    baseDifficulty = 4; // Challenging
  } else if (correctPercentage >= 70) {
    baseDifficulty = 3; // Moderate
  } else if (correctPercentage >= 60) {
    baseDifficulty = 2.5; // Moderate-Easy
  } else {
    baseDifficulty = 2; // Easy
  }
  
  // Create range around base difficulty
  return {
    min: Math.max(1, Math.floor(baseDifficulty - 1)),
    max: Math.min(5, Math.ceil(baseDifficulty + 1))
  };
}

/**
 * Select questions for a specific domain with target difficulty
 * @param {string} certificationId - Certification ID
 * @param {string} domain - Domain name
 * @param {number} count - Number of questions to select
 * @param {Object} difficulty - Target difficulty range
 * @returns {Array} - Selected questions
 */
async function selectDomainQuestions(certificationId, domain, count, difficulty) {
  // Query for questions in target difficulty range
  const questions = await Question.find({
    certificationId,
    domain,
    difficulty: { $gte: difficulty.min, $lte: difficulty.max },
    active: true
  }).limit(count * 2); // Get more than needed to allow randomization
  
  // If not enough questions in range, expand search
  if (questions.length < count) {
    const additionalQuestions = await Question.find({
      certificationId,
      domain,
      active: true,
      _id: { $nin: questions.map(q => q._id) }
    }).limit(count - questions.length);
    
    questions.push(...additionalQuestions);
  }
  
  // Randomize and limit to requested count
  return _.sampleSize(questions, Math.min(count, questions.length));
}

/**
 * Get recommended exams based on user's performance
 * @param {string} userId - User ID
 * @param {string} certificationId - Certification ID
 * @returns {Array} - Recommended exams with scores
 */
exports.getRecommendedExams = async (userId, certificationId) => {
  try {
    // Get user's performance metrics
    const user = await User.findById(userId);
    const certProgress = user.certificationProgress?.find(
      cp => cp.certificationId.toString() === certificationId.toString()
    );
    
    // If no progress data, recommend general exams
    if (!certProgress) {
      return getGeneralRecommendations(certificationId);
    }
    
    // Get all available exams for this certification
    const allExams = await getAvailableExams(certificationId);
    
    // Calculate readiness score
    const readinessScore = certProgress.estimatedReadiness || 0;
    
    // Recommend exams based on readiness
    let recommendations = [];
    
    if (readinessScore < 40) {
      // Beginner: Focus on fundamentals
      recommendations = allExams
        .filter(exam => exam.difficulty === 'beginner')
        .slice(0, 3);
    } else if (readinessScore < 70) {
      // Intermediate: Mix of practice and topic-focused
      const practiceExams = allExams
        .filter(exam => exam.type === 'practice' && exam.difficulty === 'intermediate')
        .slice(0, 1);
        
      const topicExams = allExams
        .filter(exam => exam.type === 'topic' && exam.difficulty !== 'advanced')
        .slice(0, 2);
        
      recommendations = [...practiceExams, ...topicExams];
    } else {
      // Advanced: Focus on full simulations and weak areas
      const simulationExams = allExams
        .filter(exam => exam.type === 'simulation')
        .slice(0, 1);
        
      const advancedExams = allExams
        .filter(exam => exam.difficulty === 'advanced')
        .slice(0, 2);
        
      recommendations = [...simulationExams, ...advancedExams];
    }
    
    return recommendations.map(exam => ({
      ...exam,
      match: calculateExamMatch(exam, certProgress)
    }));
  } catch (err) {
    console.error('Error getting recommended exams:', err);
    return [];
  }
};

/**
 * Get improvement recommendations based on performance
 * @param {string} userId - User ID
 * @param {string} certificationId - Certification ID
 * @param {Array} domainScores - Domain scores from latest attempt
 * @returns {Object} - Improvement recommendations
 */
exports.getImprovementRecommendations = async (userId, certificationId, domainScores) => {
  try {
    // Identify weak domains (below 70%)
    const weakDomains = domainScores
      .filter(ds => ds.score < 70)
      .sort((a, b) => a.score - b.score);
      
    // Get questions from weak domains that user got wrong
    const recentAttempts = await Attempt.find({
      userId,
      certificationId,
      completed: true
    }).sort({ createdAt: -1 }).limit(3);
    
    const wrongQuestionIds = recentAttempts
      .flatMap(a => a.questions)
      .filter(q => !q.correct && weakDomains.some(d => d.domain === q.domain))
      .map(q => q.questionId);
      
    // Get associated questions to analyze patterns
    const wrongQuestions = await Question.find({
      _id: { $in: wrongQuestionIds }
    });
    
    // Group by tags to identify specific weak topics
    const tagCounts = {};
    wrongQuestions.forEach(q => {
      q.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    // Sort tags by frequency
    const weakTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }))
      .slice(0, 5);
      
    // Generate study recommendations
    const studyRecommendations = generateStudyRecommendations(
      weakDomains,
      weakTags
    );
    
    // Generate practice strategy
    const practiceStrategy = generatePracticeStrategy(
      weakDomains,
      weakTags,
      recentAttempts
    );
    
    return {
      weakDomains: weakDomains.map(d => d.domain),
      weakTopics: weakTags.map(t => t.tag),
      studyRecommendations,
      practiceStrategy,
      estimatedImprovementTime: calculateEstimatedImprovementTime(weakDomains.length, weakTags.length)
    };
  } catch (err) {
    console.error('Error generating improvement recommendations:', err);
    return {
      weakDomains: [],
      weakTopics: [],
      studyRecommendations: ['Focus on reviewing the exam domains with lowest scores'],
      practiceStrategy: ['Take more practice exams to identify specific weak areas']
    };
  }
};

// Helper functions for recommendations

function getGeneralRecommendations(certificationId) {
  // Implementation would query database for general recommendations
  // Simplified mock implementation
  return [
    {
      id: 'intro-exam',
      name: 'Introduction to AWS Concepts',
      type: 'beginner',
      match: 90
    },
    {
      id: 'fundamentals',
      name: 'AWS Fundamentals Practice',
      type: 'beginner',
      match: 85
    }
  ];
}

async function getAvailableExams(certificationId) {
  // Implementation would query database for available exams
  // Simplified mock implementation
  return [
    {
      id: 'beginner-1',
      name: 'AWS Core Services Overview',
      type: 'topic',
      difficulty: 'beginner'
    },
    {
      id: 'practice-1',
      name: 'AWS Solutions Architect Practice Exam 1',
      type: 'practice',
      difficulty: 'intermediate'
    },
    {
      id: 'simulation-1',
      name: 'Full AWS Certification Simulation',
      type: 'simulation',
      difficulty: 'advanced'
    }
  ];
}

function calculateExamMatch(exam, certProgress) {
  // Calculate how well an exam matches user's current needs
  // Simplified implementation
  const baseMatch = 70;
  
  let matchScore = baseMatch;
  
  // Adjust based on difficulty vs readiness
  if (exam.difficulty === 'beginner' && certProgress.estimatedReadiness < 50) {
    matchScore += 20;
  } else if (exam.difficulty === 'intermediate' && 
            certProgress.estimatedReadiness >= 50 && 
            certProgress.estimatedReadiness < 80) {
    matchScore += 20;
  } else if (exam.difficulty === 'advanced' && certProgress.estimatedReadiness >= 80) {
    matchScore += 20;
  }
  
  // Adjust based on attempts
  if (certProgress.attemptsCount < 3 && exam.type !== 'simulation') {
    matchScore += 10;
  } else if (certProgress.attemptsCount >= 3 && exam.type === 'simulation') {
    matchScore += 10;
  }
  
  return Math.min(100, matchScore);
}

function generateStudyRecommendations(weakDomains, weakTags) {
  const recommendations = [];
  
  // Domain-specific recommendations
  weakDomains.slice(0, 3).forEach(domain => {
    recommendations.push(`Focus on strengthening your knowledge of ${domain.domain}`);
  });
  
  // Topic-specific recommendations
  weakTags.slice(0, 3).forEach(tag => {
    recommendations.push(`Review concepts related to ${tag.tag}`);
  });
  
  // Add general recommendations if needed
  if (recommendations.length < 5) {
    const generalRecs = [
      'Review AWS documentation for key services',
      'Practice with hands-on labs to reinforce concepts',
      'Focus on understanding the AWS Well-Architected Framework',
      'Review case studies for practical applications'
    ];
    
    recommendations.push(
      ...generalRecs.slice(0, 5 - recommendations.length)
    );
  }
  
  return recommendations;
}

function generatePracticeStrategy(weakDomains, weakTags, recentAttempts) {
  const strategy = [];
  
  // Based on performance pattern
  const attemptsCount = recentAttempts.length;
  const latestScore = recentAttempts[0]?.score?.overall || 0;
  const improvedFromPrevious = attemptsCount > 1 && 
    latestScore > (recentAttempts[1]?.score?.overall || 0);
  
  if (attemptsCount < 3) {
    strategy.push('Take more practice exams to establish a performance baseline');
  } else if (!improvedFromPrevious) {
    strategy.push('Focus on targeted topic exams before attempting another full practice exam');
  }
  
      // Based on weak domains
  if (weakDomains.length > 0) {
    strategy.push(`Take domain-specific mini-exams focusing on: ${
      weakDomains.slice(0, 2).map(d => d.domain).join(', ')}`);
  }
  
  // Based on wrong questions
  if (weakTags.length > 0) {
    strategy.push(`Practice questions specifically tagged with: ${
      weakTags.slice(0, 3).map(t => t.tag).join(', ')}`);
  }
  
  // Time management if needed
  const timeIssues = recentAttempts.some(a => 
    a.questions.filter(q => q.timeSpent > 120).length > a.questions.length * 0.2
  );
  
  if (timeIssues) {
    strategy.push('Work on time management with timed mini-exams');
  }
  
  return strategy;
}

function calculateEstimatedImprovementTime(weakDomainsCount, weakTopicsCount) {
  // Simple estimation algorithm
  const baseHours = 10;
  const perDomainHours = 5;
  const perTopicHours = 2;
  
  return baseHours + (weakDomainsCount * perDomainHours) + (weakTopicHours * perTopicHours);
}