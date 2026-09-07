import { LifeEvent, MilestoneImage } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Heart, TrendingUp, Zap, Image as ImageIcon } from 'lucide-react';

interface EventTimelineProps {
  events: LifeEvent[];
  images?: MilestoneImage[];
  onViewImage?: (imageId: string) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoading?: boolean;
}

export function EventTimeline({ events, images = [], onViewImage, hasMore = false, onLoadMore, isLoading = false }: EventTimelineProps) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'dramatic':
        return <Zap className="h-4 w-4" />;
      case 'turning_point':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Heart className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'dramatic':
        return 'border-l-red-500';
      case 'turning_point':
        return 'border-l-yellow-500';
      default:
        return 'border-l-blue-500';
    }
  };

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No life events yet. Click "Generate Event" to start the journey.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        // Find if this event has a milestone image
        const milestoneImage = images.find(img => img.event_id === event.id);
        
        return (
          <Card key={event.id} className={`border-l-4 ${getEventColor(event.event_type)} animate-slide-in`} style={{ animationDelay: `${index * 0.1}s` }}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    event.event_type === 'dramatic' ? 'bg-red-500/10 text-red-500' :
                    event.event_type === 'turning_point' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-blue-500/10 text-blue-500'
                  }`}>
                    {getEventIcon(event.event_type)}
                  </div>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{event.title}</h3>
                        {milestoneImage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 rounded-full hover:bg-primary/10"
                            onClick={() => onViewImage?.(milestoneImage.id)}
                            title="View milestone image"
                          >
                            <ImageIcon className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Age {Math.floor(event.simulated_age)} • {new Date(event.simulated_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {event.event_type.replace('_', ' ')}
                    </Badge>
                  </div>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {event.description}
                </p>
                
                {event.emotional_impact !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Emotional Impact:</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${event.emotional_impact >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.abs(event.emotional_impact) * 10}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {event.emotional_impact > 0 ? '+' : ''}{event.emotional_impact}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        );
      })}
      
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading}
            className="w-full max-w-xs"
          >
            {isLoading ? (
              <>
                <Calendar className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                View History
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
