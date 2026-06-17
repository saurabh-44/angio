import { cn } from '@/lib/utils';

// Wraps every chart in a consistent bento card with an eyebrow + title
// row, optional subtitle/trailing-stat. The chart itself goes in a
// fixed-height body so the bento grid stays even across the row.
export default function ChartCard({
  title,
  subtitle,
  eyebrow,
  trailing,
  height = 260,
  className,
  children,
}) {
  return (
    <div className={cn('bento-card p-5 sm:p-6 flex flex-col', className)}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          {eyebrow && (
            <div className="text-[10px] uppercase tracking-widest text-primary font-medium mb-1">
              {eyebrow}
            </div>
          )}
          <h3 className="font-heading text-base font-semibold text-foreground leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {trailing}
      </div>
      <div style={{ height }} className="-mx-2">
        {children}
      </div>
    </div>
  );
}
