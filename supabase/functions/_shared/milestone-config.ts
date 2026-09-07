/**
 * Milestone Image Generation Configuration
 * 
 * Adjust these values to control when milestone images are generated
 */

export const MILESTONE_CONFIG = {
  /**
   * Average number of events before a milestone image is generated
   * Higher value = less frequent milestone images
   * Lower value = more frequent milestone images
   * 
   * Default: 10 (approximately 1 milestone per 10 events)
   */
  EVENTS_PER_MILESTONE: 10,
  
  /**
   * Base probability for milestone generation
   * This is calculated as 1 / EVENTS_PER_MILESTONE
   * 
   * For example:
   * - EVENTS_PER_MILESTONE = 10 → ~10% chance per event
   * - EVENTS_PER_MILESTONE = 5 → ~20% chance per event
   * - EVENTS_PER_MILESTONE = 20 → ~5% chance per event
   */
  get BASE_PROBABILITY() {
    return 1 / this.EVENTS_PER_MILESTONE;
  },
  
  /**
   * Event type multipliers for milestone probability
   * Dramatic events have higher chance of becoming milestones
   */
  EVENT_TYPE_MULTIPLIERS: {
    dramatic: 3.0,        // 3x more likely
    turning_point: 2.0,   // 2x more likely
    daily: 0.5,           // 50% less likely
  },
  
  /**
   * Event category bonus probabilities
   * Certain categories are more likely to generate milestone images
   */
  CATEGORY_BONUSES: {
    romance: 0.3,         // +30% chance
    achievement: 0.3,     // +30% chance
    loss: 0.2,           // +20% chance
    conflict: 0.1,       // +10% chance
    travel: 0.15,        // +15% chance
    // Other categories use base probability
  },
};

/**
 * Calculate milestone probability for a given event
 */
export function calculateMilestoneProbability(
  eventType: string,
  eventCategory: string
): number {
  const baseProbability = MILESTONE_CONFIG.BASE_PROBABILITY;
  const typeMultiplier = MILESTONE_CONFIG.EVENT_TYPE_MULTIPLIERS[eventType as keyof typeof MILESTONE_CONFIG.EVENT_TYPE_MULTIPLIERS] || 1.0;
  const categoryBonus = MILESTONE_CONFIG.CATEGORY_BONUSES[eventCategory as keyof typeof MILESTONE_CONFIG.CATEGORY_BONUSES] || 0;
  
  // Calculate final probability: base * type_multiplier + category_bonus
  const probability = (baseProbability * typeMultiplier) + categoryBonus;
  
  // Cap at 100%
  return Math.min(probability, 1.0);
}

/**
 * Determine if an event should generate a milestone image
 */
export function shouldGenerateMilestone(
  eventType: string,
  eventCategory: string
): boolean {
  const probability = calculateMilestoneProbability(eventType, eventCategory);
  const random = Math.random();
  
  console.log(`Milestone check: type=${eventType}, category=${eventCategory}, probability=${(probability * 100).toFixed(1)}%, random=${(random * 100).toFixed(1)}%`);
  
  return random < probability;
}
