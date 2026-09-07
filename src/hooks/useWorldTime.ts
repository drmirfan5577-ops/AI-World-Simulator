import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface WorldState {
  id: string;
  current_world_date: string;
  world_created_at: string;
  time_ratio_hours_to_weeks: number;
  real_time_last_synced: string;
  updated_at: string;
}

/**
 * Calculate current world time on client side
 * Same logic as server-side world-time.ts
 */
function calculateCurrentWorldTime(worldState: WorldState): Date {
  const lastSyncedWorld = new Date(worldState.current_world_date);
  const lastSyncedReal = new Date(worldState.real_time_last_synced);
  const now = new Date();
  
  // Calculate real hours elapsed since last sync
  const realHoursElapsed = (now.getTime() - lastSyncedReal.getTime()) / (1000 * 60 * 60);
  
  // Calculate simulated weeks to add (based on time ratio)
  const simulatedWeeksToAdd = realHoursElapsed * worldState.time_ratio_hours_to_weeks;
  
  // Calculate simulated days to add
  const simulatedDaysToAdd = simulatedWeeksToAdd * 7;
  
  // Calculate new world date
  const currentWorldDate = new Date(lastSyncedWorld);
  currentWorldDate.setDate(currentWorldDate.getDate() + simulatedDaysToAdd);
  
  return currentWorldDate;
}

export function useWorldTime() {
  const { data: worldState, isLoading, error } = useQuery({
    queryKey: ['world-time'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('world_state')
        .select('*')
        .eq('id', 'singleton')
        .single();

      if (error) throw error;
      return data as WorldState;
    },
    refetchInterval: 60000, // Refetch every minute to keep time updated
  });

  const currentWorldDate = worldState ? calculateCurrentWorldTime(worldState) : null;

  return {
    worldState,
    currentWorldDate,
    isLoading,
    error,
    formatWorldDate: (date: Date | null) => {
      if (!date) return 'Loading...';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    },
  };
}
