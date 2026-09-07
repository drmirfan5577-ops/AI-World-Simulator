/**
 * World Time Calculation Utility
 * 
 * Calculates the current simulated world time based on:
 * - World creation date (2000-01-01)
 * - Time ratio (1 real hour = 1 simulated week by default)
 * - Real elapsed time since last sync
 */

export interface WorldState {
  id: string;
  current_world_date: string;
  world_created_at: string;
  time_ratio_hours_to_weeks: number;
  real_time_last_synced: string;
  updated_at: string;
}

/**
 * Calculate current world time based on real elapsed time
 */
export function calculateCurrentWorldTime(worldState: WorldState): Date {
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

/**
 * Sync world state to database with current calculated time
 */
export async function syncWorldTime(supabase: any): Promise<Date> {
  // Get current world state
  const { data: worldState, error: fetchError } = await supabase
    .from('world_state')
    .select('*')
    .eq('id', 'singleton')
    .single();

  if (fetchError) throw fetchError;

  // Calculate current world time
  const currentWorldDate = calculateCurrentWorldTime(worldState);
  
  // Update world state in database
  const { error: updateError } = await supabase
    .from('world_state')
    .update({
      current_world_date: currentWorldDate.toISOString().split('T')[0],
      real_time_last_synced: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'singleton');

  if (updateError) throw updateError;

  return currentWorldDate;
}

/**
 * Get current world time (calculated, not synced to DB)
 */
export async function getCurrentWorldTime(supabase: any): Promise<Date> {
  const { data: worldState, error } = await supabase
    .from('world_state')
    .select('*')
    .eq('id', 'singleton')
    .single();

  if (error) throw error;

  return calculateCurrentWorldTime(worldState);
}
