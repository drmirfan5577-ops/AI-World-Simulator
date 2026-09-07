import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { EventTimeline } from '@/components/features/EventTimeline';
import { EventCalendar } from '@/components/features/EventCalendar';
import { RelationshipGraph } from '@/components/features/RelationshipGraph';
import { useBot } from '@/hooks/useBots';
import { useLifeEvents } from '@/hooks/useLifeEvents';
import { useMilestoneImages } from '@/hooks/useMilestoneImages';
import { useNPCs } from '@/hooks/useNPCs';
import { useBotAge, useBotLifeStage } from '@/hooks/useBotAge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Sparkles, Image as ImageIcon, Network, Calendar, List, Lock } from 'lucide-react';
import { getClientId } from '@/lib/clientId';
import { getLifeStageColor } from '@/lib/utils';

export function BotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('events');
  const [eventView, setEventView] = useState<'timeline' | 'calendar'>('timeline');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [highlightedImageId, setHighlightedImageId] = useState<string | null>(null);
  
  const { data: bot, isLoading: botLoading } = useBot(id);
  const { events, isLoading: eventsLoading, hasMore: hasMoreEvents, loadMore: loadMoreEvents, generateEvent } = useLifeEvents(id);
  const { images, isLoading: imagesLoading, hasMore: hasMoreImages, loadMore: loadMoreImages } = useMilestoneImages(id);
  const { data: npcs = [], isLoading: npcsLoading } = useNPCs(id);
  
  // Check if current user is the owner
  const currentClientId = getClientId();
  const isOwner = bot?.client_id === currentClientId;

  // Calculate bot's current age and life stage using hooks
  const currentAge = useBotAge(bot);
  const currentLifeStage = useBotLifeStage(bot);

  // Filter events by selected date
  const filteredEvents = selectedDate && eventView === 'timeline'
    ? events.filter(event => {
        const eventDate = new Date(event.simulated_date);
        return (
          eventDate.getDate() === selectedDate.getDate() &&
          eventDate.getMonth() === selectedDate.getMonth() &&
          eventDate.getFullYear() === selectedDate.getFullYear()
        );
      })
    : events;

  // Handle navigation from event to image
  const handleViewImage = (imageId: string) => {
    setHighlightedImageId(imageId);
    setActiveTab('images');
    // Scroll to image after tab change
    setTimeout(() => {
      const element = document.getElementById(`image-${imageId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleDateSelect = (date: Date | null) => {
    setSelectedDate(date);
    if (date) {
      setEventView('timeline');
    }
  };

  if (botLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container py-8">
          <p>Bot not found</p>
        </div>
      </div>
    );
  }

  // If not owner, show restricted access message
  if (!isOwner) {
    return (
      <div className="min-h-screen">
        <Header />
        
        <main className="container py-8">
          <Button variant="ghost" className="mb-6" onClick={() => navigate('/discover')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Discover
          </Button>

          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-12 text-center space-y-6">
              <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-10 w-10 text-muted-foreground" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl font-bold">This Bot is Private</h2>
                <p className="text-muted-foreground">
                  You can only view detailed information for bots you've created.
                </p>
              </div>

              <div className="pt-4 space-y-3">
                <Button
                  size="lg"
                  onClick={() => navigate('/dashboard')}
                  className="w-full max-w-xs"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Create Your Own Bot
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/discover')}
                  className="w-full max-w-xs"
                >
                  Explore Other Bots
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container py-8">
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Bot Profile Card */}
        <Card className="mb-8 bg-gradient-to-br from-primary/5 to-blue-500/5">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="text-6xl h-16 w-16 rounded-full border-4 border-primary flex items-center justify-center">
                  {bot.avatar_emoji || '🙂'}
                </div>
                <div>
                  <CardTitle className="text-2xl mb-1">{bot.name}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{bot.zodiac_sign}</span>
                    <span>•</span>
                    <span>{bot.mbti_type}</span>
                    <span>•</span>
                    <span className="capitalize">{bot.gender}</span>
                  </div>
                </div>
              </div>
              <Badge className={`${getLifeStageColor(currentLifeStage)} capitalize text-sm px-3 py-1`}>
                {currentLifeStage.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Age</p>
                <p className="text-xl font-semibold">{currentAge} years</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Emotional State</p>
                <p className="text-xl font-semibold">{bot.emotional_state || 'Neutral'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Life Events</p>
                <p className="text-xl font-semibold">{events.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Milestones</p>
                <p className="text-xl font-semibold">{images.length}</p>
              </div>
            </div>
            
            {/* Personality Details */}
            <div className="mt-4 pt-4 border-t space-y-3">
              {/* Core Contradiction */}
              {bot.personality_profile?.core_contradiction && (
                <div className="p-3 border border-amber-500/30 rounded-lg bg-amber-500/5">
                  <p className="font-medium text-amber-700 dark:text-amber-400 mb-1 text-xs flex items-center gap-1">
                    🎭 Inner Conflict
                  </p>
                  <p className="text-sm mb-2">{bot.personality_profile.core_contradiction.description}</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div className="text-green-600 dark:text-green-400">✓ Desires: {bot.personality_profile.core_contradiction.desires}</div>
                    <div className="text-red-600 dark:text-red-400">✗ Fears: {bot.personality_profile.core_contradiction.fears}</div>
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
                <div>
                  <p className="font-medium text-xs mb-1">Additional Notes</p>
                  <p className="text-sm text-muted-foreground">{bot.additional_traits}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mb-6">
          <Button 
            size="lg" 
            onClick={() => generateEvent.mutate(bot.id)}
            disabled={generateEvent.isPending}
          >
            {generateEvent.isPending ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5 mr-2" />
            )}
            Observe Life Event
          </Button>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="events">Life Events</TabsTrigger>
            <TabsTrigger value="relationships">
              <Network className="h-4 w-4 mr-2" />
              Relationships
            </TabsTrigger>
            <TabsTrigger value="images">
              <ImageIcon className="h-4 w-4 mr-2" />
              Milestone Images
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-4">
            {/* View Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant={eventView === 'timeline' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEventView('timeline')}
                >
                  <List className="h-4 w-4 mr-2" />
                  Timeline
                </Button>
                <Button
                  variant={eventView === 'calendar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setEventView('calendar');
                    setSelectedDate(null);
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar
                </Button>
              </div>
              
              {selectedDate && eventView === 'timeline' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(null)}
                >
                  Clear Filter
                </Button>
              )}
            </div>

            {eventsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : eventView === 'calendar' ? (
              <EventCalendar
                events={events}
                onDateSelect={handleDateSelect}
                selectedDate={selectedDate}
              />
            ) : (
              <>
                {selectedDate && (
                  <Card className="bg-primary/5 border-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          Showing events from {selectedDate.toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="text-muted-foreground">
                          ({filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'})
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <EventTimeline 
                  events={filteredEvents} 
                  images={images}
                  onViewImage={handleViewImage}
                  hasMore={hasMoreEvents && !selectedDate}
                  onLoadMore={loadMoreEvents}
                  isLoading={eventsLoading}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="relationships">
            {npcsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : npcs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No relationships yet. Generate life events to meet new people and build connections.
                </CardContent>
              </Card>
            ) : (
              <RelationshipGraph bot={bot} npcs={npcs} />
            )}
          </TabsContent>

          <TabsContent value="images">
            {imagesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : images.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No milestone images yet. Continue generating life events to capture special moments.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {images.map((image) => {
                  // Find the corresponding event
                  const relatedEvent = events.find(e => e.id === image.event_id);
                  const isHighlighted = image.id === highlightedImageId;
                  
                  return (
                    <Card 
                      key={image.id} 
                      id={`image-${image.id}`}
                      className={`overflow-hidden transition-all duration-300 ${
                        isHighlighted ? 'ring-4 ring-primary shadow-lg shadow-primary/20' : ''
                      }`}
                      onAnimationEnd={() => {
                        if (isHighlighted) {
                          setTimeout(() => setHighlightedImageId(null), 2000);
                        }
                      }}
                    >
                      <div className="aspect-square bg-muted relative">
                        <img 
                          src={image.image_url} 
                          alt={image.milestone_type}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="capitalize backdrop-blur-sm bg-background/80">
                            {image.milestone_type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4 space-y-2">
                        {relatedEvent && (
                          <>
                            <div className="flex items-start gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(relatedEvent.simulated_date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Age {Math.floor(image.simulated_age)}
                                </p>
                              </div>
                            </div>
                            <h4 className="font-semibold text-sm line-clamp-2 leading-tight">
                              {relatedEvent.title}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {relatedEvent.description}
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                </div>
                
                {hasMoreImages && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={loadMoreImages}
                      disabled={imagesLoading}
                      className="w-full max-w-xs"
                    >
                      {imagesLoading ? (
                        <>
                          <ImageIcon className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-4 w-4 mr-2" />
                          View History
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
