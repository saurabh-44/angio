import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef(({ className, type = 'text', ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      // min-w-0 lets the input shrink inside grid/flex columns — without it a
      // native date/number input keeps its intrinsic min-width and overflows
      // (overlapping siblings) in a 2-column layout.
      'flex h-11 w-full min-w-0 rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
