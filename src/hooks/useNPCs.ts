import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { NPC } from '@/types';

export function useNPCs(botId: string | undefined) {
  return useQuery({
    queryKey: ['npcs', botId],
    queryFn: async () => {
      if (!botId) throw new Error('Bot ID is required');
      
      const { data, error } = await supabase
        .from('npcs')
        .select('*')
        .eq('bot_id', botId)
        .order('importance_level', { ascending: false });

      if (error) throw error;
      return data as NPC[];
    },
    enabled: !!botId,
  });
}
