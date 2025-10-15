/**
 * Developer Console Component
 * 
 * Displays real-time SDS events for debugging and workshop demonstrations
 */

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, Terminal, Trash2, Pause, Play } from 'lucide-react';
import { SDSEvent } from '@/lib/waku';
import { WakuService } from '@/lib/waku';

const MAX_EVENTS = 100; // Keep last 100 events

export function DevConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<SDSEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wakuService = WakuService.getInstance();

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = wakuService.onSDSEvent((event) => {
      if (isPaused) return;
      
      setEvents(prev => {
        const updated = [...prev, event];
        // Keep only last MAX_EVENTS
        return updated.slice(-MAX_EVENTS);
      });
    });

    return unsubscribe;
  }, [isOpen, isPaused]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, isPaused]);

  const getEventColor = (type: string) => {
    switch (type) {
      case 'out': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'in': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'error': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'out': return '↑';
      case 'in': return '↓';
      case 'error': return '⚠';
      default: return '•';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    }) + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

  const formatDetails = (details: any) => {
    if (typeof details === 'string') return details;
    if (details?.messageId) return `ID: ${details.messageId.substring(0, 12)}...`;
    if (details?.count !== undefined) return `Count: ${details.count}`;
    if (Array.isArray(details)) return `${details.length} items`;
    return JSON.stringify(details).substring(0, 50);
  };

  const clearEvents = () => setEvents([]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Toggle Button */}
      <div className="flex justify-center mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="gap-2 shadow-lg"
        >
          <Terminal className="h-4 w-4" />
          Dev Console
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          {events.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {events.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Console Panel */}
      {isOpen && (
        <Card className="rounded-t-lg rounded-b-none border-b-0 shadow-2xl">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              <span className="font-semibold text-sm">SDS Event Monitor</span>
              <Badge variant="outline" className="text-xs">
                {events.length} events
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
                className="h-8 w-8 p-0"
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearEvents}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-64" ref={scrollRef}>
            <div className="p-4 space-y-2 font-mono text-xs">
              {events.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No events yet. Waiting for SDS activity...
                </div>
              ) : (
                events.map((event, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded border ${getEventColor(event.type)}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base font-bold shrink-0">
                        {getEventIcon(event.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs font-normal">
                            {formatTimestamp(event.timestamp)}
                          </Badge>
                          <span className="font-semibold">
                            {event.type}:{event.event}
                          </span>
                        </div>
                        <div className="mt-1 text-muted-foreground truncate">
                          {formatDetails(event.details)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
