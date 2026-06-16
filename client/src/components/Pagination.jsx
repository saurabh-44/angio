import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

export default function Pagination({ page, limit, total, onChange }) {
  if (!total || total <= limit) return null;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between py-3 px-1 text-sm text-muted-foreground">
      <div>
        Showing <span className="text-foreground font-medium">{start}–{end}</span> of{' '}
        <span className="text-foreground font-medium">{total}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="px-3 tabular-nums">
          {page} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="icon"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
