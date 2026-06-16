import { cn } from '@/lib/utils';

// Simple text-initials avatar (we don't store profile photos in this app).
export function Avatar({ name = '', className, ...props }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary text-sm font-semibold',
        className,
      )}
      {...props}
    >
      {initials || '?'}
    </div>
  );
}
