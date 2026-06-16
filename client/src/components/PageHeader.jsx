import { cn } from '@/lib/utils';

// Consistent page header used by every dashboard route. Title left,
// optional eyebrow text above it, optional action button(s) right.
export default function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6',
        className,
      )}
    >
      <div>
        {eyebrow && (
          <div className="text-xs font-medium uppercase tracking-widest text-primary mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
