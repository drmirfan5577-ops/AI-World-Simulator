import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LifeEvent } from '@/types';
import { toast } from 'sonner';
import { useState } from 'react';

const EVENTS_PER_PAGE = 10;

export function useLifeEvents(botId: string | undefined) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['life-events', botId, page],
    queryFn: async () => {
      if (!botId) return { events: [], hasMore: false };
      
      const { data, error, count } = await supabase
        .from('life_events')
        .select('*', { count: 'exact' })
        .eq('bot_id', botId)
        .order('simulated_date', { ascending: false })
        .range(0, page * EVENTS_PER_PAGE - 1);

      if (error) throw error;
      
      const hasMore = count ? count > page * EVENTS_PER_PAGE : false;
      
      return {
        events: data as LifeEvent[],
        hasMore,
        total: count || 0,
      };
    },
    enabled: !!botId,
  });

  const events = data?.events || [];
  const hasMore = data?.hasMore || false;
  const total = data?.total || 0;

  const generateEvent = useMutation({
    mutationFn: async (botId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-events', {
        body: { botId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['life-events', botId] });
      queryClient.invalidateQueries({ queryKey: ['bot', botId] });
      toast.success('New life event generated!');
    },
    onError: (error: any) => {
      console.error('Generate event error:', error);
      toast.error(error.message || 'Failed to generate event');
    },
  });

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  const reset = () => {
    setPage(1);
  };

  return {
    events,
    isLoading,
    hasMore,
    total,
    loadMore,
    reset,
    generateEvent,
  };
}
