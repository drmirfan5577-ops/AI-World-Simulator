import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Bot, CreateBotInput } from '@/types';
import { toast } from 'sonner';
import { getClientId } from '@/lib/clientId';

export function useBots() {
  const queryClient = useQueryClient();
  const clientId = getClientId();

  const { data: bots = [], isLoading } = useQuery({
    queryKey: ['bots', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Bot[];
    },
  });

  const createBot = useMutation({
    mutationFn: async (input: CreateBotInput) => {
      // Call edge function to generate bot profile
      const { data: profileData, error: functionError } = await supabase.functions.invoke('generate-bot-profile', {
        body: { ...input, client_id: clientId },
      });

      if (functionError) throw functionError;

      const botData = {
        client_id: clientId,
        ...input,
        current_age: input.initial_age,
        personality_profile: profileData.personality_profile,
        emotional_state: profileData.emotional_state,
        birth_year: profileData.birth_year,
        preferred_language: profileData.preferred_language || 'en',
      };

      const { data, error } = await supabase
        .from('bots')
        .insert([botData])
        .select()
        .single();

      if (error) throw error;
      return data as Bot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots', clientId] });
      toast.success('Bot created successfully!');
    },
    onError: (error: any) => {
      console.error('Create bot error:', error);
      toast.error(error.message || 'Failed to create bot');
    },
  });

  const deleteBot = useMutation({
    mutationFn: async (botId: string) => {
      const { error } = await supabase
        .from('bots')
        .delete()
        .eq('id', botId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots', clientId] });
      toast.success('Bot deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete bot');
    },
  });

  return {
    bots,
    isLoading,
    createBot,
    deleteBot,
  };
}

export function useBot(botId: string | undefined) {
  return useQuery({
    queryKey: ['bot', botId],
    queryFn: async () => {
      if (!botId) throw new Error('Bot ID is required');
      
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .single();

      if (error) throw error;
      return data as Bot;
    },
    enabled: !!botId,
  });
}
