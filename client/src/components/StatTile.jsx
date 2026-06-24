import { cn } from '@/lib/utils';

// Generic bento stat tile. `tone` paints the icon chip + a quiet
// background-tint variant for the hero stat.
export function StatTile({ icon: Icon, label, value, sub, tone = 'leaf', hero = false, className }) {
  const tones = {
    leaf: {
      chip: 'bg-[#0B5000]/10 text-[#0B5000]',
      tint: 'bg-[#F6FAF6]',
    },
    amber: {
      chip: 'bg-amber-100 text-amber-600',
      tint: 'bg-amber-50',
    },
    sky: {
      chip: 'bg-secondary text-secondary-foreground',
      tint: 'bg-secondary/40',
    },
    neutral: {
      chip: 'bg-muted text-foreground',
      tint: 'bg-card',
    },
  };
  const t = tones[tone] ?? tones.leaf;
  return (
    <div
      className={cn(
        'bento-card p-5 sm:p-6 flex flex-col gap-3',
        hero && t.tint,
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            'grid h-10 w-10 place-items-center rounded-xl',
            t.chip,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
      <div>
        <div className="font-heading text-3xl font-bold tracking-tight text-foreground">
          {value}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">{label}</div>
        {sub && <div className="mt-2 text-xs text-muted-foreground/80">{sub}</div>}
      </div>
    </div>
  );
}
