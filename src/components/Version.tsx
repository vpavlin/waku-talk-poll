import { Badge } from '@/components/ui/badge';

// Update this version whenever you make changes
export const APP_VERSION = 'v1.0.6';

export function Version() {
  return (
    <Badge 
      variant="outline" 
      className="font-mono text-xs"
    >
      {APP_VERSION}
    </Badge>
  );
}
