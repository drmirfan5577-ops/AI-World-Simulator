import { useState, useMemo } from 'react';
import { LifeEvent } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventCalendarProps {
  events: LifeEvent[];
  onDateSelect?: (date: Date | null) => void;
  selectedDate?: Date | null;
}

export function EventCalendar({ events, onDateSelect, selectedDate }: EventCalendarProps) {
  const [currentYear, setCurrentYear] = useState(() => {
    if (events.length > 0) {
      return new Date(events[0].simulated_date).getFullYear();
    }
    return new Date().getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (events.length > 0) {
      return new Date(events[0].simulated_date).getMonth();
    }
    return new Date().getMonth();
  });
  const [view, setView] = useState<'month' | 'year'>('month');

  // Get all years that have events
  const yearsWithEvents = useMemo(() => {
    const years = new Set<number>();
    events.forEach(event => {
      years.add(new Date(event.simulated_date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [events]);

  // Get events for the current view
  const eventsByDate = useMemo(() => {
    const map = new Map<string, LifeEvent[]>();
    events.forEach(event => {
      const date = new Date(event.simulated_date);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [events]);

  // Get events count for each month in current year
  const eventsByMonth = useMemo(() => {
    const map = new Map<number, number>();
    events.forEach(event => {
      const date = new Date(event.simulated_date);
      if (date.getFullYear() === currentYear) {
        const month = date.getMonth();
        map.set(month, (map.get(month) || 0) + 1);
      }
    });
    return map;
  }, [events, currentYear]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day);
    const dateKey = `${currentYear}-${currentMonth}-${day}`;
    
    if (eventsByDate.has(dateKey)) {
      // If there are events on this date, select it
      if (selectedDate && 
          selectedDate.getDate() === day && 
          selectedDate.getMonth() === currentMonth && 
          selectedDate.getFullYear() === currentYear) {
        // Deselect if clicking the same date
        onDateSelect?.(null);
      } else {
        onDateSelect?.(clickedDate);
      }
    }
  };

  const handleMonthClick = (monthIndex: number) => {
    setCurrentMonth(monthIndex);
    setView('month');
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderMonthView = () => {
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square p-1" />
      );
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${currentYear}-${currentMonth}-${day}`;
      const dayEvents = eventsByDate.get(dateKey) || [];
      const hasEvents = dayEvents.length > 0;
      const isSelected = selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentMonth &&
        selectedDate.getFullYear() === currentYear;
      
      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          disabled={!hasEvents}
          className={cn(
            "aspect-square p-1 rounded-lg relative transition-all",
            "hover:bg-accent hover:scale-105",
            hasEvents ? "cursor-pointer" : "cursor-default opacity-50",
            isSelected && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          <div className="text-sm font-medium">{day}</div>
          {hasEvents && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-0.5">
              {dayEvents.slice(0, 3).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-3 h-3 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )}
                />
              ))}
              {dayEvents.length > 3 && (
                <div className="text-[10px] ml-0.5 font-semibold">+{dayEvents.length - 3}</div>
              )}
            </div>
          )}
        </button>
      );
    }
    
    return days;
  };

  const renderYearView = () => {
    return (
      <div className="grid grid-cols-3 gap-3 p-4">
        {monthNames.map((month, index) => {
          const eventCount = eventsByMonth.get(index) || 0;
          const hasEvents = eventCount > 0;
          
          return (
            <button
              key={month}
              onClick={() => handleMonthClick(index)}
              className={cn(
                "p-4 rounded-lg border-2 transition-all",
                "hover:border-primary hover:bg-accent",
                hasEvents ? "border-primary/30" : "border-muted"
              )}
            >
              <div className="font-medium text-sm mb-1">{month.slice(0, 3)}</div>
              {hasEvents && (
                <Badge variant="secondary" className="text-xs">
                  {eventCount} {eventCount === 1 ? 'event' : 'events'}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // Get selected date events
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
    return eventsByDate.get(dateKey) || [];
  }, [selectedDate, eventsByDate]);

  return (
    <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Life Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView(view === 'month' ? 'year' : 'month')}
              >
                {view === 'month' ? 'Year View' : 'Month View'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (view === 'month') {
                  handlePreviousMonth();
                } else {
                  setCurrentYear(currentYear - 1);
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center">
              <h3 className="font-semibold text-lg">
                {view === 'month' 
                  ? `${monthNames[currentMonth]} ${currentYear}`
                  : currentYear
                }
              </h3>
              {view === 'month' && (
                <p className="text-xs text-muted-foreground">
                  {eventsByMonth.get(currentMonth) || 0} events this month
                </p>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (view === 'month') {
                  handleNextMonth();
                } else {
                  setCurrentYear(currentYear + 1);
                }
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick year navigation */}
          {yearsWithEvents.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap justify-center">
              <span className="text-xs text-muted-foreground">Jump to:</span>
              {yearsWithEvents.map(year => (
                <Button
                  key={year}
                  variant={currentYear === year ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCurrentYear(year);
                  }}
                  className="h-7 text-xs"
                >
                  {year}
                </Button>
              ))}
            </div>
          )}

          {/* Calendar Grid */}
          {view === 'month' ? (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderMonthView()}
              </div>
            </>
          ) : (
            renderYearView()
          )}

          {/* Legend */}
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Legend:</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Has events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border-2 border-primary bg-primary text-primary-foreground flex items-center justify-center text-[10px]">15</div>
                <span className="text-muted-foreground">Selected date</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            {selectedDate 
              ? `Events on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : 'Select a date'
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {selectedDate 
                ? 'No events on this date'
                : 'Click on a highlighted date to see events'
              }
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {selectedDateEvents.map((event, index) => (
                <Card key={event.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm line-clamp-2 flex-1">
                        {event.title}
                      </h4>
                      <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                        {event.event_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-muted-foreground">
                        Age {Math.floor(event.simulated_age)}
                      </span>
                      {event.emotional_impact !== undefined && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className={cn(
                            "text-xs font-medium",
                            event.emotional_impact >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {event.emotional_impact > 0 ? '+' : ''}{event.emotional_impact} impact
                          </span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
