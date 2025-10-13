/**
 * Connection Status Component
 * 
 * Displays Waku network connection status
 */

import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isInitializing: boolean;
}

export function ConnectionStatus({ isConnected, isInitializing }: ConnectionStatusProps) {
  if (isInitializing) {
    return (
      <Badge variant="secondary" className="gap-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Connecting...
      </Badge>
    );
  }

  if (isConnected) {
    return (
      <Badge variant="default" className="gap-2 bg-success">
        <Wifi className="h-3 w-3" />
        Connected
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="gap-2">
      <WifiOff className="h-3 w-3" />
      Disconnected
    </Badge>
  );
}
