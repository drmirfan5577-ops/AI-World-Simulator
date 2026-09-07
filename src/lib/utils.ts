import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Bot } from '@/types';
import { supabase } from './supabase';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Calculate life stage from age
export function getLifeStageFromAge(age: number): string {
  if (age < 13) return 'childhood';
  if (age < 20) return 'teen';
  if (age < 36) return 'youth';
  if (age < 60) return 'middle_age';
  return 'old_age';
}

// Calculate bot's current age based on world time (synchronous with cached world time)
export async function calculateBotAgeAsync(bot: Bot): Promise<number> {
  if (!bot.birth_year) {
    return Math.floor(bot.current_age); // Fallback to stored age
  }

  try {
    const { data: worldTime, error } = await supabase
      .from('world_state')
      .select('current_world_date')
      .eq('id', 'singleton')
      .single();

    if (error || !worldTime) {
      console.error('Failed to fetch world time:', error);
      return Math.floor(bot.current_age);
    }

    const currentWorldDate = new Date(worldTime.current_world_date);
    const currentYear = currentWorldDate.getFullYear();
    return currentYear - bot.birth_year;
  } catch (error) {
    console.error('Error calculating bot age:', error);
    return Math.floor(bot.current_age);
  }
}

// Legacy function - kept for backward compatibility but should use hook version
export function calculateBotAge(bot: Bot, worldTime?: { current_world_date: string }): number {
  if (!worldTime || !bot.birth_year) {
    return Math.floor(bot.current_age); // Fallback to stored age
  }
  
  const currentWorldDate = new Date(worldTime.current_world_date);
  const currentYear = currentWorldDate.getFullYear();
  return currentYear - bot.birth_year;
}

// Get life stage color for badges
export function getLifeStageColor(stage: string): string {
  const colors: Record<string, string> = {
    childhood: 'bg-blue-500',
    teen: 'bg-green-500',
    youth: 'bg-yellow-500',
    middle_age: 'bg-orange-500',
    old_age: 'bg-purple-500',
  };
  return colors[stage] || 'bg-gray-500';
}
