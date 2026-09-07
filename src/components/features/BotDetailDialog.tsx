import { useState } from 'react';
import { Bot } from '@/types';
import { useLifeEvents } from '@/hooks/useLifeEvents';
import { useNPCs } from '@/hooks/useNPCs';
import { useBots } from '@/hooks/useBots';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getClientId } from '@/lib/clientId';
import { useBotAge, useBotLifeStage } from '@/hooks/useBotAge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Heart, 
  Calendar, 
  Sparkles, 
  User,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BotDetailDialogProps {
  bot: Bot;
  open: boolean;
  onClose: () => void;
}

export function BotDetailDialog({ bot, open, onClose }: BotDetailDialogProps) {
  const clientId = getClientId();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  
  const { events, isLoading: eventsLoading } = useLifeEvents(bot.id);
  const { data: npcs = [] } = useNPCs(bot.id);

  // Get user's bots to establish connection
  const { bots: myBots } = useBots();
  const myActiveBot = myBots?.[0]; // Use first bot for connection
  
  // Calculate current age and life stage using hooks
  const currentAge = useBotAge(bot);
  const currentLifeStage = useBotLifeStage(bot);

  // Check if already connected
  const isConnected = npcs.some(npc => npc.linked_bot_id && myActiveBot && npc.linked_bot_id === myActiveBot.id);

  const recentEvents = events.slice(0, 3);

  const connectBots = useMutation({
    mutationFn: async () => {
      if (!myActiveBot) {
        throw new Error('You need to create a bot first to connect with others');
      }

      if (myActiveBot.id === bot.id) {
        throw new Error('You cannot connect with yourself');
      }

      setIsConnecting(true);

      const { data, error } = await supabase.functions.invoke('establish-connection', {
        body: {
          fromBotId: myActiveBot.id,
          toBotId: bot.id,
        },
      });

      if (error) throw error;

      if (data.success === false) {
        throw new Error(data.message || 'Connection failed');
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success(`${myActiveBot.name} and ${bot.name} are now connected!`, {
        description: `They met at ${data.encounter.location}`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['npcs'] });
      queryClient.invalidateQueries({ queryKey: ['life_events'] });
      queryClient.invalidateQueries({ queryKey: ['discover-bots'] });
      
      setIsConnecting(false);
    },
    onError: (error: any) => {
      toast.error('Connection failed', {
        description: error.message,
      });
      setIsConnecting(false);
    },
  });

  const handleConnect = () => {
    if (!myActiveBot) {
      toast.error('Create a bot first', {
        description: 'You need to create your own bot before connecting with others',
      });
      return;
    }
    connectBots.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="text-6xl w-20 h-20 rounded-full border-4 border-primary flex items-center justify-center">
              {bot.avatar_emoji || '🙂'}
            </div>
            
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{bot.name}</DialogTitle>
              <DialogDescription className="space-y-2">
                <div className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4" />
                  <span>{currentAge} years old</span>
                  <span>•</span>
                  <span className="capitalize">{bot.gender}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{bot.zodiac_sign}</Badge>
                  <Badge variant="outline">{bot.mbti_type}</Badge>
                  <Badge className="capitalize">
                    {currentLifeStage.replace('_', ' ')}
                  </Badge>
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {/* Personality Profile */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Personality
          </h3>
          <div className="space-y-3 text-sm">
            {bot.emotional_state && (
              <div>
                <p className="text-muted-foreground">Current Mood: <span className="text-foreground font-medium">{bot.emotional_state}</span></p>
              </div>
            )}
            
            {/* Core Contradiction */}
            {bot.personality_profile?.core_contradiction && (
              <div className="p-3 border border-amber-500/30 rounded-lg bg-amber-500/5">
                <p className="font-medium text-amber-700 dark:text-amber-400 mb-1 text-xs">🎭 Inner Conflict</p>
                <p className="text-foreground text-xs">{bot.personality_profile.core_contradiction.description}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <span className="text-green-600 dark:text-green-400">✓ Desires: {bot.personality_profile.core_contradiction.desires}</span>
                  <br />
                  <span className="text-red-600 dark:text-red-400">✗ Fears: {bot.personality_profile.core_contradiction.fears}</span>
                </div>
              </div>
            )}

            {/* Hidden Traits */}
            {bot.personality_profile?.hidden_traits && bot.personality_profile.hidden_traits.length > 0 && (
              <div className="p-3 border border-purple-500/30 rounded-lg bg-purple-500/5">
                <p className="font-medium text-purple-700 dark:text-purple-400 mb-2 text-xs">🎪 Hidden Depths</p>
                <div className="space-y-2">
                  {bot.personality_profile.hidden_traits.map((trait: any, idx: number) => (
                    <div key={idx} className="text-xs">
                      <p className="text-foreground font-medium">{trait.trait}</p>
                      <p className="text-muted-foreground">Emerges when: {trait.trigger_conditions}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Basic Traits */}
            {bot.personality_profile?.traits && bot.personality_profile.traits.length > 0 && (
              <div>
                <p className="font-medium text-xs mb-2">Core Traits</p>
                <div className="flex flex-wrap gap-1">
                  {bot.personality_profile.traits.map((trait: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">{trait}</Badge>
                  ))}
                </div>
              </div>
            )}

            {bot.additional_traits && (
              <p className="text-muted-foreground">{bot.additional_traits}</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Recent Events */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Recent Life Events
          </h3>
          {eventsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No events yet. This bot's journey is just beginning!
            </p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <div 
                  key={event.id}
                  className="p-3 border border-border rounded-lg bg-card/50 hover:bg-card transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    <Badge variant="outline" className="text-xs capitalize">
                      {event.event_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {event.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {format(new Date(event.simulated_date), 'MMM d, yyyy')} • Age {Math.floor(event.simulated_age)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Connection Action */}
        <div className="flex gap-3">
          {bot.client_id === clientId ? (
            <Button className="flex-1" variant="outline" disabled>
              <User className="w-4 h-4 mr-2" />
              This is your bot
            </Button>
          ) : isConnected ? (
            <Button className="flex-1" variant="outline" disabled>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Already Connected
            </Button>
          ) : (
            <Button 
              className="flex-1" 
              onClick={handleConnect}
              disabled={isConnecting || !myActiveBot}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 mr-2" />
                  Say Hi
                </>
              )}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
