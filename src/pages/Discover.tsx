import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BotDetailDialog } from '@/components/features/BotDetailDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Bot } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Sparkles, Heart, Briefcase, TrendingUp, Coffee } from 'lucide-react';
import { getClientId } from '@/lib/clientId';
import { useBotAge, useBotLifeStage } from '@/hooks/useBotAge';

// Emoji pool for bot avatars (avoiding duplicates)
const EMOJI_POOL = [
  '😊', '🤗', '😎', '🤓', '😇', '🥳', '🤩', '😌', '🙂', '😄',
  '🤔', '😏', '🥰', '😍', '🤯', '🧐', '😋', '😜', '🤪', '😺',
  '🦁', '🐯', '🐻', '🐼', '🐨', '🦊', '🐱', '🐶', '🐰', '🦝',
  '🌟', '✨', '💫', '🎭', '🎨', '🎪', '🎯', '🎲', '🎸', '🎹',
];

// Helper component to display bot age
function BotAgeDisplay({ bot }: { bot: Bot }) {
  const age = useBotAge(bot);
  return (
    <p className="text-sm text-muted-foreground">
      {age} years old
    </p>
  );
}

// Helper component to display bot life stage
function BotLifeStageDisplay({ bot }: { bot: Bot }) {
  const lifeStage = useBotLifeStage(bot);
  return (
    <Badge variant="outline" className="text-xs">
      {lifeStage.replace('_', ' ')}
    </Badge>
  );
}

export function Discover() {
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const clientId = getClientId();

  const { data: bots = [], isLoading } = useQuery({
    queryKey: ['discover-bots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .order('last_event_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as Bot[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch recent events for all bots to generate activity summaries
  const { data: recentEventsData } = useQuery({
    queryKey: ['discover-recent-events', bots.map(b => b.id)],
    queryFn: async () => {
      if (bots.length === 0) return {};
      
      const { data, error } = await supabase
        .from('life_events')
        .select('bot_id, event_category, title, description, simulated_date')
        .in('bot_id', bots.map(b => b.id))
        .order('simulated_date', { ascending: false })
        .limit(bots.length * 3); // Get up to 3 recent events per bot

      if (error) throw error;
      
      // Group events by bot_id
      const grouped: Record<string, any[]> = {};
      data?.forEach((event: any) => {
        if (!grouped[event.bot_id]) grouped[event.bot_id] = [];
        if (grouped[event.bot_id].length < 3) {
          grouped[event.bot_id].push(event);
        }
      });
      
      return grouped;
    },
    enabled: bots.length > 0,
  });

  // Check if bot is active (had events in last 24 hours)
  const isBotActive = (bot: Bot) => {
    if (!bot.last_event_at) return false;
    const lastEvent = new Date(bot.last_event_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastEvent.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  // Get consistent emoji for bot based on ID
  const getBotEmoji = (bot: Bot) => {
    if (bot.avatar_emoji && bot.avatar_emoji !== '🙂') {
      return bot.avatar_emoji;
    }
    // Generate consistent emoji based on bot ID
    const hash = bot.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return EMOJI_POOL[hash % EMOJI_POOL.length];
  };

  // Update bot emoji if it's default
  const updateBotEmoji = async (bot: Bot) => {
    if (bot.avatar_emoji && bot.avatar_emoji !== '🙂') return;
    
    const emoji = getBotEmoji(bot);
    await supabase
      .from('bots')
      .update({ avatar_emoji: emoji })
      .eq('id', bot.id);
  };

  // Generate mood description based on emotional state
  const getMoodDescription = (bot: Bot) => {
    const moodMap: Record<string, { text: string; icon: any }> = {
      'Happy': { text: 'Feeling great lately!', icon: Heart },
      'Content': { text: 'Things are going well', icon: Coffee },
      'Excited': { text: 'Really excited about what\'s ahead', icon: Sparkles },
      'Sad': { text: 'Going through some tough times', icon: Heart },
      'Troubled': { text: 'Feeling a bit lost lately', icon: Heart },
      'Anxious': { text: 'A bit stressed these days', icon: Coffee },
      'Neutral': { text: 'Taking things as they come', icon: Coffee },
    };
    
    return moodMap[bot.emotional_state || 'Neutral'] || moodMap['Neutral'];
  };

  // Generate activity description from recent events
  const getActivityDescription = (bot: Bot, events: any[]) => {
    if (!events || events.length === 0) {
      return { text: 'Just starting the journey', icon: Sparkles };
    }

    const latestEvent = events[0];
    const category = latestEvent.event_category;
    
    // Generate activity based on event category
    const activityMap: Record<string, { prefix: string; icon: any }> = {
      'career': { prefix: 'Working on', icon: Briefcase },
      'education': { prefix: 'Studying', icon: TrendingUp },
      'romance': { prefix: 'Exploring', icon: Heart },
      'achievement': { prefix: 'Celebrating', icon: Sparkles },
      'friendship': { prefix: 'Spending time with', icon: Heart },
      'personal_growth': { prefix: 'Focusing on', icon: TrendingUp },
      'travel': { prefix: 'Discovering', icon: Sparkles },
      'health': { prefix: 'Taking care of', icon: Coffee },
    };
    
    const activity = activityMap[category] || { prefix: 'Experiencing', icon: Coffee };
    
    // Create a brief, engaging description
    let description = latestEvent.title;
    if (description.length > 50) {
      description = description.substring(0, 47) + '...';
    }
    
    return {
      text: description,
      icon: activity.icon,
    };
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
            Discover Bots
          </h1>
          <p className="text-muted-foreground">
            Explore the AI World and connect with other bots
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : bots.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No bots have been created yet. Be the first to create a bot!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {bots.map((bot) => {
              const isActive = isBotActive(bot);
              const isOwnBot = bot.client_id === clientId;
              const emoji = getBotEmoji(bot);
              const botEvents = recentEventsData?.[bot.id] || [];
              const mood = getMoodDescription(bot);
              const activity = getActivityDescription(bot, botEvents);
              const MoodIcon = mood.icon;
              const ActivityIcon = activity.icon;
              
              // Update emoji in background if needed
              if (bot.avatar_emoji === '🙂') {
                updateBotEmoji(bot);
              }

              return (
                <Card 
                  key={bot.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden group"
                  onClick={() => setSelectedBot(bot)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      {/* Avatar with status indicator */}
                      <div className="relative">
                        <div 
                          className={`
                            text-6xl w-20 h-20 rounded-full flex items-center justify-center
                            ${isOwnBot
                              ? 'border-4 border-purple-500 shadow-lg shadow-purple-500/50'
                              : isActive 
                                ? 'border-4 border-primary animate-pulse shadow-lg shadow-primary/50' 
                                : 'border-4 border-gray-300'
                            }
                            group-hover:scale-110 transition-transform duration-300
                          `}
                        >
                          {emoji}
                        </div>
                        {isActive && (
                          <div className="absolute -top-1 -right-1">
                            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                          </div>
                        )}
                        {isOwnBot && (
                          <Badge 
                            variant="secondary" 
                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs"
                          >
                            You
                          </Badge>
                        )}
                      </div>

                      {/* Bot Info */}
                      <div className="space-y-1 w-full">
                        <h3 className="font-bold text-lg truncate">{bot.name}</h3>
                        <BotAgeDisplay bot={bot} />
                      </div>

                      {/* Personality Tags */}
                      <div className="flex flex-wrap gap-1 justify-center">
                        <Badge variant="outline" className="text-xs">
                          {bot.zodiac_sign}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {bot.mbti_type}
                        </Badge>
                        <BotLifeStageDisplay bot={bot} />
                      </div>

                      
                      <Separator className="my-2" />

                      {/* Recent Mood */}
                      <div className="w-full space-y-2 text-left">
                        <div className="flex items-start gap-2">
                          <MoodIcon className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">Recent mood:</p>
                            <p className="text-sm italic text-foreground/80 line-clamp-2">
                              "{mood.text}"
                            </p>
                          </div>
                        </div>

                        {/* Current Activity */}
                        <div className="flex items-start gap-2">
                          <ActivityIcon className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">Working on:</p>
                            <p className="text-sm italic text-foreground/80 line-clamp-2">
                              "{activity.text}"
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {selectedBot && (
          <BotDetailDialog
            bot={selectedBot}
            open={!!selectedBot}
            onClose={() => setSelectedBot(null)}
          />
        )}
      </main>
    </div>
  );
}
