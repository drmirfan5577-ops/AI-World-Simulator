import { useWorldTime } from '@/hooks/useWorldTime';
import { Clock, Calendar, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function WorldTimeClock() {
  const { currentWorldDate, formatWorldDate, worldState } = useWorldTime();
  const [, setTick] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  // Update every second for smooth time display
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!currentWorldDate || !worldState) {
    return null;
  }

  const timeRatio = worldState.time_ratio_hours_to_weeks;
  const ratioText = timeRatio === 1 
    ? '1 hour = 1 week'
    : `1 hour = ${timeRatio} week${timeRatio > 1 ? 's' : ''}`;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isExpanded ? (
        <div className="bg-gradient-to-br from-primary/90 to-primary-dark backdrop-blur-sm rounded-2xl shadow-2xl border border-primary-light/20 p-4 min-w-[280px] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-background/20 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-primary-foreground animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wide">
                World Time
              </div>
              <div className="text-lg font-bold text-primary-foreground">
                {formatWorldDate(currentWorldDate)}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-background/20 text-primary-foreground"
              onClick={() => setIsExpanded(false)}
              title="Minimize"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 pt-3 border-t border-primary-light/20">
            <Calendar className="w-4 h-4 text-primary-foreground/60" />
            <div className="text-xs text-primary-foreground/80">
              Time flows at <span className="font-semibold">{ratioText}</span>
            </div>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setIsExpanded(true)}
          className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/90 to-primary-dark hover:from-primary hover:to-primary-dark shadow-2xl border border-primary-light/20 p-0 animate-in fade-in zoom-in duration-200"
          title="Show World Time"
        >
          <Clock className="h-5 w-5 text-primary-foreground animate-pulse" />
        </Button>
      )}
    </div>
  );
}
