import { useMemo } from 'react';
import { Bot } from '@/types';
import { useWorldTime } from './useWorldTime';

/**
 * Hook to calculate bot's current age based on world time
 * This ensures age is always calculated with the latest world time
 */
export function useBotAge(bot: Bot | undefined): number {
  const { currentWorldDate: worldTime } = useWorldTime();

  return useMemo(() => {
    if (!bot) return 0;
    
    // If we have birth_year and world time, calculate accurate age
    if (bot.birth_year && worldTime) {
      const currentWorldDate = new Date(worldTime);
      const currentYear = currentWorldDate.getFullYear();
      const calculatedAge = currentYear - bot.birth_year;
      return Math.max(0, calculatedAge); // Ensure non-negative age
    }
    
    // Fallback to stored age
    return Math.floor(bot.current_age);
  }, [bot, worldTime]);
}

/**
 * Hook to calculate life stage from bot's current age
 */
export function useBotLifeStage(bot: Bot | undefined): string {
  const age = useBotAge(bot);
  
  return useMemo(() => {
    if (age < 13) return 'childhood';
    if (age < 20) return 'teen';
    if (age < 36) return 'youth';
    if (age < 60) return 'middle_age';
    return 'old_age';
  }, [age]);
}
