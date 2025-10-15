/**
 * Developer Console Component
 * 
 * Displays real-time SDS events for debugging and workshop demonstrations
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, Terminal, Trash2, Pause, Play, ArrowDown, GripHorizontal } from 'lucide-react';
import { SDSEvent } from '@/lib/waku';
import { WakuService } from '@/lib/waku';

const MAX_EVENTS = 100; // Keep last 100 events
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 300;

export function DevConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<SDSEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const [stickToBottom, setStickToBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);
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

  // Auto-scroll to bottom when new events arrive if stickToBottom is enabled
  useEffect(() => {
    if (scrollRef.current && stickToBottom && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, isPaused, stickToBottom]);

  // Handle scroll - disable stickToBottom if user scrolls up
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
    
    if (isAtBottom && !stickToBottom) {
      setStickToBottom(true);
    } else if (!isAtBottom && stickToBottom) {
      setStickToBottom(false);
    }
  }, [stickToBottom]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = height;
  }, [height]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = resizeStartY.current - e.clientY;
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeStartHeight.current + deltaY));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setStickToBottom(true);
    }
  }, []);

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
          {/* Resize Handle */}
          <div
            onMouseDown={handleResizeStart}
            className={`h-2 cursor-ns-resize hover:bg-primary/20 transition-colors flex items-center justify-center group ${
              isResizing ? 'bg-primary/30' : ''
            }`}
          >
            <GripHorizontal className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>

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
                onClick={scrollToBottom}
                className="h-8 w-8 p-0"
                disabled={stickToBottom}
              >
                <ArrowDown className={`h-4 w-4 ${stickToBottom ? 'opacity-50' : ''}`} />
              </Button>
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

          <div
            className="overflow-y-auto"
            style={{ height: `${height}px` }}
            ref={scrollRef}
            onScroll={handleScroll}
          >
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
          </div>
        </Card>
      )}
    </div>
  );
}
