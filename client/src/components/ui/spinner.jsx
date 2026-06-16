import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className, label = 'Loading' }) {
  return (
    <div role="status" aria-label={label} className={cn('inline-block', className)}>
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
