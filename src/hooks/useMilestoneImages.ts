import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { MilestoneImage } from '@/types';
import { useState } from 'react';

const IMAGES_PER_PAGE = 10;

export function useMilestoneImages(botId: string | undefined) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['milestone-images', botId, page],
    queryFn: async () => {
      if (!botId) return { images: [], hasMore: false };
      
      const { data, error, count } = await supabase
        .from('milestone_images')
        .select('*', { count: 'exact' })
        .eq('bot_id', botId)
        .order('created_at', { ascending: false }) // Most recent first
        .range(0, page * IMAGES_PER_PAGE - 1);

      if (error) throw error;
      
      const hasMore = count ? count > page * IMAGES_PER_PAGE : false;
      
      return {
        images: data as MilestoneImage[],
        hasMore,
        total: count || 0,
      };
    },
    enabled: !!botId,
  });

  const images = data?.images || [];
  const hasMore = data?.hasMore || false;
  const total = data?.total || 0;

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  const reset = () => {
    setPage(1);
  };

  return {
    images,
    isLoading,
    hasMore,
    total,
    loadMore,
    reset,
  };
}
